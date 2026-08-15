import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { createCloudinaryAssetsHandler } from "./server/cloudinary-assets-handler";

function cloudinaryLocalApi(env: Record<string, string>): Plugin {
  const handleCloudinaryAssets = createCloudinaryAssetsHandler(env);
  const handler = async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    const requestUrl = new URL(request.url ?? "/", "http://localhost");
    if (requestUrl.pathname !== "/api/cloudinary/assets") {
      next();
      return;
    }

    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (value) headers.set(name, value);
    }
    const chunks: Buffer[] = [];
    if (request.method !== "GET" && request.method !== "HEAD") {
      for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
    }
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const result = await handleCloudinaryAssets(
      new Request(requestUrl, { method: request.method, headers, body }),
    );
    response.statusCode = result.status;
    result.headers.forEach((value, name) => response.setHeader(name, value));
    response.end(await result.text());
  };

  return {
    name: "cloudinary-local-api",
    configureServer(server) {
      server.middlewares.use(handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  return {
    plugins: [react(), tailwindcss(), cloudinaryLocalApi(env)],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    build: {
      sourcemap: false,
    },
  };
});
