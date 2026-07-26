import type { AuthProvider } from "@refinedev/core";
import type { ActiveProfile } from "@/domain/entities";
import { getCurrentActiveProfile } from "@/infrastructure/supabase/profile";
import { supabaseClient } from "@/infrastructure/supabase/client";
import { AppError, toAppError } from "@/shared/errors";
import { canAccessAdmin } from "@/application/policies/admin-access";

export interface AdminIdentity extends ActiveProfile {
  email: string;
}

async function requireAdmin(): Promise<ActiveProfile> {
  const profile = await getCurrentActiveProfile();
  if (!canAccessAdmin(profile)) {
    throw new AppError("This account is not an active administrator.", 403);
  }
  return profile;
}

export const authProvider: AuthProvider = {
  login: async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: toAppError(error) };
    try {
      await requireAdmin();
      return { success: true, redirectTo: "/" };
    } catch (error) {
      await supabaseClient.auth.signOut({ scope: "local" });
      return { success: false, error: toAppError(error) };
    }
  },
  logout: async () => {
    const { error } = await supabaseClient.auth.signOut({ scope: "local" });
    return error
      ? { success: false, error: toAppError(error) }
      : { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error || !data.session) {
      return { authenticated: false, logout: true, redirectTo: "/login" };
    }
    try {
      await requireAdmin();
      return { authenticated: true };
    } catch (authError) {
      return {
        authenticated: false,
        logout: true,
        redirectTo: "/login",
        error: toAppError(authError),
      };
    }
  },
  onError: async (error: unknown) => {
    const mapped = toAppError(error);
    if (mapped.statusCode === 401 || mapped.statusCode === 403) {
      return { logout: true, redirectTo: "/login", error: mapped };
    }
    return { error: mapped };
  },
  getPermissions: async () => (await requireAdmin()).role,
  getIdentity: async () => {
    const [{ data }, profile] = await Promise.all([
      supabaseClient.auth.getUser(),
      requireAdmin(),
    ]);
    return {
      ...profile,
      email: data.user?.email ?? "",
    } satisfies AdminIdentity;
  },
};
