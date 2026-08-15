import { v2 as cloudinary } from "cloudinary";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RuntimeEnv = Record<string, string | undefined>;

class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function requiredEnv(env: RuntimeEnv, ...names: string[]): string {
  for (const name of names) {
    const value = env[name]?.trim();
    if (value) return value;
  }
  throw new HttpError(`Server environment variable ${names[0]} is unavailable.`, 503);
}

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Vary": "Authorization",
      ...headers,
    },
  });
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match?.[1]) throw new HttpError("Authentication is required.", 401);
  return match[1];
}

async function requireActiveAdministrator(
  request: Request,
  env: RuntimeEnv,
): Promise<SupabaseClient> {
  const supabaseUrl = requiredEnv(env, "SUPABASE_URL", "VITE_SUPABASE_URL");
  const publishableKey = requiredEnv(
    env,
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  );
  const token = bearerToken(request);
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    throw new HttpError("The administrator session is invalid or expired.", 401);
  }

  const { data, error } = await supabase.rpc("current_active_profile");
  if (error) {
    console.error("Cloudinary API authorization failed:", error.message);
    throw new HttpError("Administrator authorization could not be verified.", 503);
  }

  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile || profile.role !== "admin" || profile.is_active !== true) {
    throw new HttpError("Active administrator access is required.", 403);
  }
  return supabase;
}

function configureCloudinary(env: RuntimeEnv): void {
  cloudinary.config({
    cloud_name: requiredEnv(env, "CLOUDINARY_CLOUD_NAME"),
    api_key: requiredEnv(env, "CLOUDINARY_API_KEY"),
    api_secret: requiredEnv(env, "CLOUDINARY_API_SECRET"),
    secure: true,
  });
}

async function deleteAsset(request: Request, supabase: SupabaseClient): Promise<Response> {
  const publicId = new URL(request.url).searchParams.get("publicId")?.trim();
  if (!publicId) throw new HttpError("publicId is required.", 400);
  if (publicId.length > 255) throw new HttpError("publicId is invalid.", 400);

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (assetError) throw new HttpError("Media ownership could not be verified.", 503);
  if (!asset) throw new HttpError("This image does not belong to the Media library.", 404);

  const { data: usage, error: usageError } = await supabase.rpc(
    "get_media_asset_usage",
    { target_public_id: publicId },
  );
  if (usageError) throw new HttpError("Media references could not be verified.", 503);
  const references = Object.values((usage ?? {}) as Record<string, number>).reduce(
    (sum, count) => sum + Number(count || 0),
    0,
  );
  if (references > 0) {
    return json(
      { error: "This image is still used by catalog or order records.", usage },
      409,
    );
  }

  const deletion = await cloudinary.api.delete_resources([publicId], {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
  const outcome = deletion.deleted?.[publicId];
  if (outcome !== "deleted" && outcome !== "not_found") {
    throw new HttpError("Cloudinary did not confirm image deletion.", 502);
  }

  const { error: deleteError } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", asset.id);
  if (deleteError) {
    console.error("Cloudinary asset deleted but media row cleanup failed:", publicId, deleteError.message);
    throw new HttpError("The image was removed, but cleanup is incomplete. Retry deletion to repair it.", 503);
  }
  return json({ success: true });
}

async function registerAsset(request: Request, supabase: SupabaseClient): Promise<Response> {
  let body: { publicId?: unknown };
  try {
    body = (await request.json()) as { publicId?: unknown };
  } catch {
    throw new HttpError("A valid JSON body is required.", 400);
  }
  const publicId = typeof body.publicId === "string" ? body.publicId.trim() : "";
  if (!publicId || publicId.length > 255) {
    throw new HttpError("The uploaded image ID is invalid.", 400);
  }

  let resource: Awaited<ReturnType<typeof cloudinary.api.resource>>;
  try {
    resource = await cloudinary.api.resource(publicId, { resource_type: "image", type: "upload" });
  } catch {
    throw new HttpError("The uploaded Cloudinary image could not be verified.", 404);
  }

  const { error } = await supabase.from("media_assets").upsert(
    {
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      asset_id: resource.asset_id ?? null,
      width: resource.width ?? null,
      height: resource.height ?? null,
      format: resource.format ?? null,
      bytes: resource.bytes ?? null,
    },
    { onConflict: "public_id" },
  );
  if (!error) return json({ success: true }, 201);

  console.error("Media registration failed; compensating Cloudinary upload:", publicId, error.message);
  try {
    await cloudinary.api.delete_resources([publicId], {
      resource_type: "image",
      type: "upload",
      invalidate: true,
    });
  } catch (cleanupError) {
    console.error("Cloudinary upload compensation also failed:", publicId, cleanupError);
  }
  throw new HttpError("The image could not be registered and the upload was rolled back.", 503);
}

export function createCloudinaryAssetsHandler(env: RuntimeEnv) {
  return async function handleCloudinaryAssets(request: Request): Promise<Response> {
    try {
      if (request.method !== "DELETE" && request.method !== "POST") {
        return json(
          { error: "Method not allowed." },
          405,
          { Allow: "DELETE, POST" },
        );
      }

      const supabase = await requireActiveAdministrator(request, env);
      configureCloudinary(env);
      return request.method === "POST"
        ? await registerAsset(request, supabase)
        : await deleteAsset(request, supabase);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("Cloudinary media request failed:", error);
      return json({ error: "Cloudinary media service is temporarily unavailable." }, 502);
    }
  };
}
