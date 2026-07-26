import type { ActiveProfile } from "@/domain/entities";

export function canAccessAdmin(profile: ActiveProfile | null | undefined) {
  return profile?.role === "admin" && profile.is_active === true;
}
