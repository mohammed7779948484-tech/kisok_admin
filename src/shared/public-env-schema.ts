import { z } from "zod";

const publicEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url().startsWith("https://"),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).startsWith("sb_publishable_"),
  VITE_CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  VITE_CLOUDINARY_UPLOAD_PRESET: z.string().min(1).optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export function parsePublicEnv(input: Record<string, unknown>): PublicEnv {
  return publicEnvSchema.parse(input);
}
