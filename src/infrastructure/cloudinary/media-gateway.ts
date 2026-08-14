import { supabaseClient } from "@/infrastructure/supabase/client";
import { AppError } from "@/shared/errors";

type MediaResponse = {
  error?: string;
};

async function authorizedRequest(input: string, init?: RequestInit): Promise<Response> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new AppError("Your administrator session has expired. Sign in again.", 401);
  }

  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers });
}

async function readJson(response: Response): Promise<MediaResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new AppError("The media service returned an invalid response.", 502);
  }

  try {
    return (await response.json()) as MediaResponse;
  } catch {
    throw new AppError("The media service returned malformed data.", 502);
  }
}

export async function deleteCloudinaryAsset(publicId: string): Promise<void> {
  const response = await authorizedRequest(
    `/api/cloudinary/assets?publicId=${encodeURIComponent(publicId)}`,
    { method: "DELETE" },
  );
  const payload = await readJson(response);
  if (!response.ok) {
    throw new AppError(payload.error || "Cloudinary media could not be deleted.", response.status);
  }
}
