import { useMemo, useSyncExternalStore } from "react";
import { useList } from "@refinedev/core";
import type { Brand, Category, Flavor, Product, StoreSettings } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import {
  readUploadedAssets,
  rememberUploadedAsset,
  forgetUploadedAsset,
} from "@/infrastructure/cloudinary/local-media-library";

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
  return JSON.stringify(readUploadedAssets());
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
  const uploadedSnapshot = useSyncExternalStore(subscribe, snapshot, () => "[]");
  const brands = useList<Brand>({ resource: "brands", pagination: { mode: "off" } });
  const categories = useList<Category>({
    resource: "categories",
    pagination: { mode: "off" },
  });
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
  });
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
  });
  const settings = useList<StoreSettings>({
    resource: "store_settings",
    pagination: { mode: "off" },
  });

  const uploadedAssets = useMemo(
    () => JSON.parse(uploadedSnapshot) as CloudinaryAsset[],
    [uploadedSnapshot],
  );

  const assets = useMemo(() => {
    const next: CloudinaryAsset[] = [...uploadedAssets];
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
    return next;
  }, [
    brands.result.data,
    categories.result.data,
    flavors.result.data,
    products.result.data,
    settings.result.data,
    uploadedAssets,
  ]);

  return {
    assets,
    isLoading:
      brands.query.isLoading ||
      categories.query.isLoading ||
      products.query.isLoading ||
      flavors.query.isLoading ||
      settings.query.isLoading,
  };
}

