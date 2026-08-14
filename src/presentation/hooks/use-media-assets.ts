import { useMemo } from "react";
import { useList } from "@refinedev/core";
import type { MediaAsset } from "@/domain/entities";
import type { CloudinaryAsset } from "@/domain/media";
import { supabaseClient } from "@/infrastructure/supabase/client";
import { toAppError } from "@/shared/errors";

export async function saveMediaAsset(asset: CloudinaryAsset): Promise<void> {
  const { error } = await supabaseClient.from("media_assets").upsert(
    {
      public_id: asset.publicId,
      secure_url: asset.secureUrl,
      asset_id: asset.id ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      format: asset.format ?? null,
      bytes: asset.bytes ?? null,
    },
    { onConflict: "public_id" },
  );
  if (error) throw toAppError(error);
}

export function useMediaAssets({ enabled = true }: { enabled?: boolean } = {}) {
  const media = useList<MediaAsset>({
    resource: "media_assets",
    pagination: { mode: "off" },
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
  };
}
