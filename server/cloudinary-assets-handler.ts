import { v2 as cloudinary } from "cloudinary";
import { createClient } from "@supabase/supabase-js";

type RuntimeEnv = Record<string, string | undefined>;

type CloudinaryResource = {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
  format?: string;
  created_at?: string;
};

type CloudinaryResourcesResponse = {
  resources?: CloudinaryResource[];
};

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

async function requireActiveAdministrator(request: Request, env: RuntimeEnv): Promise<void> {
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
}

function configureCloudinary(env: RuntimeEnv): void {
  cloudinary.config({
    cloud_name: requiredEnv(env, "CLOUDINARY_CLOUD_NAME"),
    api_key: requiredEnv(env, "CLOUDINARY_API_KEY"),
    api_secret: requiredEnv(env, "CLOUDINARY_API_SECRET"),
    secure: true,
  });
}

function isApplicationAsset(asset: CloudinaryResource): boolean {
  return (
    !asset.public_id.startsWith("cld-sample") &&
    !asset.public_id.startsWith("samples/") &&
    asset.public_id !== "sample" &&
    asset.public_id !== "main-sample" &&
    !asset.public_id.endsWith("-sample")
  );
}

async function listAssets(): Promise<Response> {
  const result = (await cloudinary.api.resources({
    resource_type: "image",
    type: "upload",
    max_results: 500,
    direction: "desc",
  })) as CloudinaryResourcesResponse;

  const assets = (result.resources ?? []).filter(isApplicationAsset).map((asset) => ({
    publicId: asset.public_id,
    secureUrl: asset.secure_url,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    createdAt: asset.created_at,
    source: "cloudinary" as const,
  }));

  return json({ assets });
}

async function deleteAsset(request: Request): Promise<Response> {
  const publicId = new URL(request.url).searchParams.get("publicId")?.trim();
  if (!publicId) throw new HttpError("publicId is required.", 400);
  if (publicId.length > 255) throw new HttpError("publicId is invalid.", 400);

  await cloudinary.api.delete_resources([publicId], {
    resource_type: "image",
    type: "upload",
    invalidate: true,
  });
  return json({ success: true });
}

export function createCloudinaryAssetsHandler(env: RuntimeEnv) {
  return async function handleCloudinaryAssets(request: Request): Promise<Response> {
    try {
      if (request.method !== "GET" && request.method !== "DELETE") {
        return json(
          { error: "Method not allowed." },
          405,
          { Allow: "GET, DELETE" },
        );
      }

      await requireActiveAdministrator(request, env);
      configureCloudinary(env);
      return request.method === "GET" ? await listAssets() : await deleteAsset(request);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      console.error("Cloudinary media request failed:", error);
      return json({ error: "Cloudinary media service is temporarily unavailable." }, 502);
    }
  };
}
