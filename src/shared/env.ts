import { parsePublicEnv } from "@/shared/public-env-schema";

export { parsePublicEnv } from "@/shared/public-env-schema";
export type { PublicEnv } from "@/shared/public-env-schema";

export const env = parsePublicEnv(import.meta.env);
