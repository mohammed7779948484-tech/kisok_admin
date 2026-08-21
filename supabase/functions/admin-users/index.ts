import {
  createClient,
  type AuthUser,
  type SupabaseClient,
} from "npm:@supabase/supabase-js@2.110.8";

type AppRole = "admin" | "preparation" | "customer";
type Profile = {
  id: string;
  email?: string;
  display_name: string;
  role: AppRole;
  is_active: boolean;
  created_at: string;
};

const roles = new Set<AppRole>(["admin", "preparation", "customer"]);
const localOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://kisok-admin.vercel.app",
]);

function isAllowedOrigin(origin: string | null) {
  if (!origin) return true;
  if (localOrigins.has(origin)) return true;
  try {
    const url = new URL(origin);
    if (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  const configured = (Deno.env.get("ADMIN_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configured.includes(origin)) return true;
  return false;
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

async function updateProfile(
  admin: SupabaseClient,
  callerId: string,
  userId: string,
  changes: Partial<Pick<Profile, "display_name" | "role" | "is_active">>,
) {
  const { data, error } = await admin.rpc("admin_update_profile", {
    actor_id: callerId,
    target_id: userId,
    changes,
  });
  if (error) {
    const status = error.code === "23514" ? 409 : 400;
    throw new RequestError(error.message, status);
  }
  return (Array.isArray(data) ? data[0] : data) as Profile;
}

async function executeAction(
  admin: SupabaseClient,
  callerId: string,
  body: Record<string, unknown>,
) {
  const action = requiredString(body, "action");

  if (action === "list") {
    const page = Math.max(1, Number(body.page) || 1);
    const requestedPerPage = Math.max(1, Number(body.perPage) || 50);
    const search =
      typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
    const perPage = Math.min(search ? 50 : 200, requestedPerPage);
    if (search) {
      const { data: rows, error: searchError } = await admin.rpc(
        "search_admin_profiles",
        {
          search_term: search,
          page_size: perPage,
          page_offset: (page - 1) * perPage,
        },
      );
      if (searchError) throw searchError;
      const profiles = (rows ?? []) as Array<Profile & { total_count: number }>;
      const users = await Promise.all(
        profiles.map(async (profile) => {
          const { data, error } = await admin.auth.admin.getUserById(profile.id);
          if (error) throw error;
          return toAdminUser(data.user, profile);
        }),
      );
      return {
        users,
        page,
        perPage,
        total: Number(profiles[0]?.total_count ?? 0),
      };
    }

    const authUsers: AuthUser[] = [];
    let authTotal = 0;
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    authUsers.push(...data.users);
    authTotal = data.total;

    const ids = authUsers.map((user) => user.id);
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
    const users = authUsers.map((user) => toAdminUser(user, profilesById.get(user.id)));
    return {
      users,
      page,
      perPage,
      total: authTotal,
    };
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
      email: email.toLowerCase(),
      display_name: displayName,
      role,
      is_active: true,
    });
    if (profileError) {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(userId);
      if (cleanupError) {
        console.error("admin-users create compensation failed", { userId, error: cleanupError.message });
      }
      throw profileError;
    }
    const profile = await getProfile(admin, userId);
    return toAdminUser(data.user, profile);
  }

  const userId = requiredString(body, "userId");

  if (action === "update") {
    const displayName = requiredString(body, "displayName");
    const role = requiredRole(body);
    const profile = await updateProfile(admin, callerId, userId, {
      display_name: displayName,
      role,
    });
    const { data: userData, error: userError } =
      await admin.auth.admin.getUserById(userId);
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
    await updateProfile(admin, callerId, userId, { is_active: false });
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
    if (authError) {
      try {
        await updateProfile(admin, callerId, userId, { is_active: true });
      } catch (cleanupError) {
        console.error("admin-users deactivate compensation failed", { userId, error: cleanupError });
      }
      throw authError;
    }
    return { success: true };
  }

  if (action === "reactivate") {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
    if (authError) throw authError;
    try {
      await updateProfile(admin, callerId, userId, { is_active: true });
    } catch (profileError) {
      const { error: cleanupError } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: "876000h",
      });
      if (cleanupError) {
        console.error("admin-users reactivate compensation failed", { userId, error: cleanupError.message });
      }
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
    const { admin, callerId } = await authorize(request);
    const body = (await request.json()) as Record<string, unknown>;
    const result = await executeAction(admin, callerId, body);
    return json(result, 200, origin);
  } catch (error) {
    if (!(error instanceof RequestError)) {
      console.error("admin-users request failed", error);
    }
    const status = error instanceof RequestError ? error.status : 500;
    const message =
      error instanceof RequestError
        ? error.message
        : "The user administration request failed.";
    return json({ error: { message } }, status, origin);
  }
});
