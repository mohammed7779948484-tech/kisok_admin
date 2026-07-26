import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  type AuthUser,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.110.8";

type AppRole = "admin" | "preparation" | "customer";
type Profile = {
  id: string;
  display_name: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

const roles = new Set<AppRole>(["admin", "preparation", "customer"]);
const localOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (localOrigins.has(origin)) return true;
  const configured = (Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "http://localhost:5173",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(
  body: unknown,
  status: number,
  origin: string | null,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

function requiredString(
  body: Record<string, unknown>,
  key: string,
  minLength = 1,
) {
  const value = body[key];
  if (typeof value !== "string" || value.trim().length < minLength) {
    throw new RequestError(`${key} is invalid.`, 400);
  }
  return value.trim();
}

function requiredRole(body: Record<string, unknown>): AppRole {
  const role = body.role;
  if (typeof role !== "string" || !roles.has(role as AppRole)) {
    throw new RequestError("role is invalid.", 400);
  }
  return role as AppRole;
}

class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function envJsonKey(name: string) {
  const raw = Deno.env.get(name);
  if (!raw) throw new Error(`${name} is not available.`);
  const keys = JSON.parse(raw) as Record<string, string>;
  const key = keys.default;
  if (!key) throw new Error(`The default key is missing from ${name}.`);
  return key;
}

async function authorize(
  request: Request,
): Promise<{ admin: SupabaseClient; callerId: string }> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new RequestError("Authentication is required.", 401);
  }
  const token = authorization.slice("Bearer ".length);
  const url = Deno.env.get("SUPABASE_URL");
  if (!url) throw new Error("SUPABASE_URL is not available.");

  const userClient = createClient(url, envJsonKey("SUPABASE_PUBLISHABLE_KEYS"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } =
    await userClient.auth.getUser(token);
  if (userError || !userData.user) {
    throw new RequestError("The session is invalid.", 401);
  }

  const admin = createClient(url, envJsonKey("SUPABASE_SECRET_KEYS"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,role,is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    profile.is_active !== true
  ) {
    throw new RequestError("Active administrator access is required.", 403);
  }
  return { admin, callerId: userData.user.id };
}

function toAdminUser(user: AuthUser, profile?: Profile) {
  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name ?? user.email ?? "Unknown user",
    role: profile?.role ?? "customer",
    isActive: profile?.is_active ?? false,
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

async function getProfile(admin: SupabaseClient, userId: string) {
  const { data, error } = await admin
    .from("profiles")
    .select("id,display_name,role,is_active,created_at")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data as Profile;
}

async function executeAction(
  admin: SupabaseClient,
  body: Record<string, unknown>,
) {
  const action = requiredString(body, "action");

  if (action === "list") {
    const page = Math.max(1, Number(body.page) || 1);
    const perPage = Math.min(200, Math.max(1, Number(body.perPage) || 50));
    const search =
      typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const ids = data.users.map((user) => user.id);
    const { data: profiles, error: profileError } = ids.length
      ? await admin
          .from("profiles")
          .select("id,display_name,role,is_active,created_at")
          .in("id", ids)
      : { data: [], error: null };
    if (profileError) throw profileError;
    const profilesById = new Map(
      (profiles as Profile[]).map((profile) => [profile.id, profile]),
    );
    const users = data.users
      .map((user) => toAdminUser(user, profilesById.get(user.id)))
      .filter((user) =>
        search
          ? `${user.email} ${user.displayName} ${user.role}`
              .toLowerCase()
              .includes(search)
          : true,
      );
    return { users, page, perPage, total: search ? users.length : data.total };
  }

  if (action === "create") {
    const email = requiredString(body, "email");
    const password = requiredString(body, "password", 10);
    const displayName = requiredString(body, "displayName");
    const role = requiredRole(body);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    const userId = data.user.id;
    const { error: profileError } = await admin.from("profiles").insert({
      id: userId,
      display_name: displayName,
      role,
      is_active: true,
    });
    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      throw profileError;
    }
    const profile = await getProfile(admin, userId);
    return toAdminUser(data.user, profile);
  }

  const userId = requiredString(body, "userId");

  if (action === "update") {
    const displayName = requiredString(body, "displayName");
    const role = requiredRole(body);
    const { error } = await admin
      .from("profiles")
      .update({ display_name: displayName, role })
      .eq("id", userId);
    if (error) throw error;
    const [{ data: userData, error: userError }, profile] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      getProfile(admin, userId),
    ]);
    if (userError) throw userError;
    return toAdminUser(userData.user, profile);
  }

  if (action === "set_password") {
    const password = requiredString(body, "password", 10);
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password,
    });
    if (error) throw error;
    return { success: true };
  }

  if (action === "deactivate") {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (authError) throw authError;
    const { error: profileError } = await admin
      .from("profiles")
      .update({ is_active: false })
      .eq("id", userId);
    if (profileError) {
      await admin.auth.admin.updateUserById(userId, { ban_duration: "none" });
      throw profileError;
    }
    return { success: true };
  }

  if (action === "reactivate") {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (authError) throw authError;
    const { error: profileError } = await admin
      .from("profiles")
      .update({ is_active: true })
      .eq("id", userId);
    if (profileError) {
      await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      throw profileError;
    }
    return { success: true };
  }

  throw new RequestError("Unsupported action.", 400);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");
  if (!isAllowedOrigin(origin)) {
    return json({ error: { message: "Origin is not allowed." } }, 403, origin);
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (request.method !== "POST") {
    return json({ error: { message: "Method not allowed." } }, 405, origin);
  }
  try {
    const { admin } = await authorize(request);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await executeAction(admin, body);
    return json(result, 200, origin);
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    const message =
      error instanceof RequestError
        ? error.message
        : "The user administration request failed.";
    return json({ error: { message } }, status, origin);
  }
});
