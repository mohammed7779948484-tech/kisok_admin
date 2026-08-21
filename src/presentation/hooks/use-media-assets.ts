import { useMemo } from "react";
import { useList } from "@refinedev/core";
import type { MediaAsset } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import { registerCloudinaryAsset } from "@/infrastructure/cloudinary/media-gateway";

export async function saveMediaAsset(asset: CloudinaryAsset): Promise<void> {
  await registerCloudinaryAsset(asset);
}

export function useMediaAssets({
  enabled = true,
  page = 1,
  pageSize = 48,
  search = "",
}: {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
} = {}) {
  const media = useList<MediaAsset>({
    resource: "media_assets",
    pagination: { currentPage: page, pageSize },
    filters: search.trim()
      ? [{ field: "public_id", operator: "contains", value: search.trim() }]
      : [],
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select:
        "id,public_id,secure_url,asset_id,width,height,format,bytes,created_by,created_at,updated_at",
    },
    queryOptions: { enabled },
  });

  const assets = useMemo<CloudinaryAsset[]>(
    () =>
      media.result.data.map((asset) => ({
        id: asset.asset_id ?? asset.id,
        publicId: asset.public_id,
        secureUrl: asset.secure_url,
        width: asset.width ?? undefined,
        height: asset.height ?? undefined,
        format: asset.format ?? undefined,
        bytes: asset.bytes ?? undefined,
        createdAt: asset.created_at,
        source: "library",
      })),
    [media.result.data],
  );

  return {
    assets,
    error: media.query.error,
    isLoading: enabled && media.query.isLoading,
    total: media.result.total ?? 0,
  };
}
