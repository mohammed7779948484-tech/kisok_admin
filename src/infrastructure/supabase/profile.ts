import type { ActiveProfile } from "@/domain/entities";
import { AppError, toAppError } from "@/shared/errors";
import { supabaseClient } from "@/infrastructure/supabase/client";

export async function getCurrentActiveProfile(): Promise<ActiveProfile> {
  const { data, error } = await supabaseClient.rpc("current_active_profile");
  if (error) throw toAppError(error);
  const profile = Array.isArray(data) ? data[0] : data;
  if (!profile) throw new AppError("No active application profile was found.", 403);
  return profile as ActiveProfile;
}
