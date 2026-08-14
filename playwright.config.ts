import { defineConfig } from "@playwright/test";
import { loadEnv } from "vite";

const localEnv = loadEnv("development", import.meta.dirname, "");
process.env.E2E_ADMIN_EMAIL ??= localEnv.E2E_ADMIN_EMAIL;
process.env.E2E_ADMIN_PASSWORD ??= localEnv.E2E_ADMIN_PASSWORD;

export default defineConfig({
  testDir: "./tests",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
