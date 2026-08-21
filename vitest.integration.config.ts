import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

const localEnv = loadEnv("development", import.meta.dirname, "");
for (const name of [
  "SUPABASE_DB_URL",
  "SUPABASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
]) {
  if (!process.env[name] && localEnv[name]) {
    process.env[name] = localEnv[name];
  }
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.ts"],
    fileParallelism: false,
  },
});
