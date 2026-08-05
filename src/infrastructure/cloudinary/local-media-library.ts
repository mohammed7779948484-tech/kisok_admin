import type { CloudinaryAsset } from "@/domain/media";

const storageKey = "kiosk-admin-cloudinary-assets";

const forgottenKey = "kiosk-admin-forgotten-assets";

function isAsset(value: unknown): value is CloudinaryAsset {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CloudinaryAsset>;
  return Boolean(candidate.publicId && candidate.secureUrl);
}

export function readUploadedAssets(): CloudinaryAsset[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter(isAsset) : [];
  } catch {
    return [];
  }
}

export function readForgottenIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(forgottenKey) ?? "[]") as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function rememberUploadedAsset(asset: CloudinaryAsset) {
  const existing = readUploadedAssets();
  const next = [asset, ...existing.filter((item) => item.publicId !== asset.publicId)];
  localStorage.setItem(storageKey, JSON.stringify(next.slice(0, 200)));

  const forgotten = readForgottenIds().filter((id) => id !== asset.publicId);
  localStorage.setItem(forgottenKey, JSON.stringify(forgotten));
}

export function forgetUploadedAsset(publicId: string) {
  const next = readUploadedAssets().filter((item) => item.publicId !== publicId);
  localStorage.setItem(storageKey, JSON.stringify(next));

  const forgotten = readForgottenIds();
  if (!forgotten.includes(publicId)) {
    localStorage.setItem(forgottenKey, JSON.stringify([...forgotten, publicId]));
  }
}

