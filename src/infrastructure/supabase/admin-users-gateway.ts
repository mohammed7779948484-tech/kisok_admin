import type {
  AdminUsersGateway,
  AdminUsersPage,
} from "@/application/ports/admin-users-gateway";
import type { AdminUser, AppRole } from "@/domain/entities";
import { supabaseClient } from "@/infrastructure/supabase/client";
import { toAppError } from "@/shared/errors";

type Action =
  | { action: "list"; page: number; perPage: number; search?: string }
  | {
      action: "create";
      email: string;
      password: string;
      displayName: string;
      role: AppRole;
    }
  | {
      action: "update";
      userId: string;
      displayName: string;
      role: AppRole;
    }
  | { action: "set_password"; userId: string; password: string }
  | { action: "deactivate" | "reactivate"; userId: string };

async function invoke<T>(body: Action): Promise<T> {
  const { data, error } = await supabaseClient.functions.invoke("admin-users", {
    body,
  });
  if (error) throw toAppError(error);
  if (data?.error) throw toAppError(data.error);
  return data as T;
}

export const adminUsersGateway: AdminUsersGateway = {
  list: (input) => invoke<AdminUsersPage>({ action: "list", ...input }),
  create: (input) => invoke<AdminUser>({ action: "create", ...input }),
  update: (input) => invoke<AdminUser>({ action: "update", ...input }),
  setPassword: async (input) => {
    await invoke({ action: "set_password", ...input });
  },
  deactivate: async (userId) => {
    await invoke({ action: "deactivate", userId });
  },
  reactivate: async (userId) => {
    await invoke({ action: "reactivate", userId });
  },
};
