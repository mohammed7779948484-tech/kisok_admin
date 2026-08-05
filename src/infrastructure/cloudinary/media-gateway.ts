import type { CloudinaryAsset } from "@/domain/media";

type MediaResponse = {
  assets?: CloudinaryAsset[];
  error?: string;
};

export async function listCloudinaryAssets(): Promise<CloudinaryAsset[]> {
  const response = await fetch("/api/cloudinary/assets", {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as MediaResponse;
  if (!response.ok) {
    throw new Error(payload.error || "Cloudinary media could not be loaded.");
  }
  return payload.assets ?? [];
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  const response = await fetch(`/api/cloudinary/assets?publicId=${encodeURIComponent(publicId)}`, {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const payload = (await response.json()) as { error?: string };
    throw new Error(payload.error || "Cloudinary media could not be deleted.");
  }
}
