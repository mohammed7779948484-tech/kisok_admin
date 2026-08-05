import { createClient } from "@refinedev/supabase";
import { env } from "@/shared/env";
import type { Database } from "@/infrastructure/supabase/database.types";

export const supabaseClient = createClient<Database>(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    db: { schema: "public" },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
