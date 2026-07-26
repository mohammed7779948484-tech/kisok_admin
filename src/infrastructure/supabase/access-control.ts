import type { AccessControlProvider } from "@refinedev/core";
import { getCurrentActiveProfile } from "@/infrastructure/supabase/profile";
import { canAccessAdmin } from "@/application/policies/admin-access";

export const accessControlProvider: AccessControlProvider = {
  can: async () => {
    try {
      const profile = await getCurrentActiveProfile();
      return canAccessAdmin(profile)
        ? { can: true }
        : { can: false, reason: "Active administrator access is required." };
    } catch {
      return { can: false, reason: "Active administrator access is required." };
    }
  },
  options: {
    buttons: { enableAccessControl: true, hideIfUnauthorized: true },
  },
};
