import { useMemo, useSyncExternalStore } from "react";
import { useList } from "@refinedev/core";
import { useQuery } from "@tanstack/react-query";
import type { Brand, Category, Flavor, Product, StoreSettings } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import {
  readUploadedAssets,
  readForgottenIds,
  rememberUploadedAsset,
  forgetUploadedAsset,
} from "@/infrastructure/cloudinary/local-media-library";
import { listCloudinaryAssets } from "@/infrastructure/cloudinary/media-gateway";

const eventName = "kiosk-admin-media-assets";

function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}

function snapshot() {
  return JSON.stringify({
    uploaded: readUploadedAssets(),
    forgotten: readForgottenIds(),
  });
}

function pushAsset(
  assets: CloudinaryAsset[],
  publicId: string | null | undefined,
  secureUrl: string | null | undefined,
  source: CloudinaryAsset["source"],
) {
  if (!publicId || !secureUrl) return;
  if (assets.some((asset) => asset.publicId === publicId)) return;
  assets.push({ publicId, secureUrl, source });
}

export function addMediaAsset(asset: CloudinaryAsset) {
  rememberUploadedAsset(asset);
  window.dispatchEvent(new Event(eventName));
}

export function removeMediaAsset(publicId: string) {
  forgetUploadedAsset(publicId);
  window.dispatchEvent(new Event(eventName));
}

export function useMediaAssets() {
  const localSnapshot = useSyncExternalStore(subscribe, snapshot, () => '{"uploaded":[],"forgotten":[]}');
  const cloudinary = useQuery({
    queryKey: ["cloudinary", "assets"],
    queryFn: listCloudinaryAssets,
    staleTime: 30_000,
  });
  const brands = useList<Brand>({
    resource: "brands",
    pagination: { mode: "off" },
    meta: { select: "id,name,image_public_id,image_secure_url" },
  });
  const categories = useList<Category>({
    resource: "categories",
    pagination: { mode: "off" },
    meta: { select: "id,name,image_public_id,image_secure_url" },
  });
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    meta: { select: "id,name,cover_public_id,cover_secure_url" },
  });
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
    meta: { select: "id,name,main_image_public_id,main_image_secure_url" },
  });
  const settings = useList<StoreSettings>({
    resource: "store_settings",
    pagination: { mode: "off" },
    meta: { select: "id,store_name,logo_public_id,logo_secure_url" },
  });

  const { uploadedAssets, forgottenIds } = useMemo(() => {
    try {
      const parsed = JSON.parse(localSnapshot) as { uploaded: CloudinaryAsset[]; forgotten: string[] };
      return {
        uploadedAssets: parsed.uploaded ?? [],
        forgottenIds: parsed.forgotten ?? [],
      };
    } catch {
      return { uploadedAssets: [], forgottenIds: [] };
    }
  }, [localSnapshot]);

  const assets = useMemo(() => {
    const next: CloudinaryAsset[] = [...(cloudinary.data ?? [])];
    for (const asset of uploadedAssets) {
      if (!next.some((item) => item.publicId === asset.publicId)) next.push(asset);
    }
    for (const brand of brands.result.data) {
      pushAsset(next, brand.image_public_id, brand.image_secure_url, "catalog");
    }
    for (const category of categories.result.data) {
      pushAsset(next, category.image_public_id, category.image_secure_url, "catalog");
    }
    for (const product of products.result.data) {
      pushAsset(next, product.cover_public_id, product.cover_secure_url, "catalog");
    }
    for (const flavor of flavors.result.data) {
      pushAsset(next, flavor.main_image_public_id, flavor.main_image_secure_url, "catalog");
    }
    for (const item of settings.result.data) {
      pushAsset(next, item.logo_public_id, item.logo_secure_url, "catalog");
    }
    return next.filter((item) => !forgottenIds.includes(item.publicId));
  }, [
    brands.result.data,
    categories.result.data,
    cloudinary.data,
    flavors.result.data,
    products.result.data,
    settings.result.data,
    uploadedAssets,
    forgottenIds,
  ]);
  const queries = [
    cloudinary,
    brands.query,
    categories.query,
    products.query,
    flavors.query,
    settings.query,
  ];
  const error = queries.find((query) => query.error)?.error;

  return {
    assets,
    error,
    isLoading: queries.some((query) => query.isLoading),
  };
}
