import { Buffer } from "node:buffer";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

function cloudinaryLocalApi(env: Record<string, string>): Plugin {
  const handler = async (
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void,
  ) => {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      response.statusCode = 503;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Cloudinary server credentials are unavailable." }));
      return;
    }

    const authorization = Buffer.from(`${apiKey}:${apiSecret}`).toString("base64");

    if (request.method === "DELETE" && request.url?.startsWith("/api/cloudinary/assets")) {
      try {
        const urlParams = new URL(request.url, "http://localhost");
        const publicId = urlParams.searchParams.get("publicId");
        if (!publicId) {
          response.statusCode = 400;
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify({ error: "publicId is required" }));
          return;
        }

        const upstream = await fetch(
          `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload?public_ids[]=${encodeURIComponent(publicId)}`,
          {
            method: "DELETE",
            headers: { Authorization: `Basic ${authorization}` },
          },
        );
        if (!upstream.ok) throw new Error(`Cloudinary returned HTTP ${upstream.status}.`);
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ success: true }));
      } catch {
        response.statusCode = 502;
        response.setHeader("Content-Type", "application/json");
        response.end(JSON.stringify({ error: "Cloudinary media could not be deleted." }));
      }
      return;
    }

    if (request.method !== "GET" || request.url !== "/api/cloudinary/assets") {
      next();
      return;
    }

    try {
      const upstream = await fetch(
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/resources/image/upload?max_results=500&direction=desc`,
        { headers: { Authorization: `Basic ${authorization}` } },
      );
      if (!upstream.ok) throw new Error(`Cloudinary returned HTTP ${upstream.status}.`);
      const payload = (await upstream.json()) as {
        resources?: Array<{
          public_id: string;
          secure_url: string;
          width?: number;
          height?: number;
          format?: string;
          created_at?: string;
        }>;
      };
      const assets = (payload.resources ?? [])
        .filter(
          (asset) =>
            !asset.public_id.startsWith("cld-sample") &&
            !asset.public_id.startsWith("samples/") &&
            asset.public_id !== "sample" &&
            asset.public_id !== "main-sample" &&
            !asset.public_id.endsWith("-sample"),
        )
        .map((asset) => ({
          publicId: asset.public_id,
          secureUrl: asset.secure_url,
          width: asset.width,
          height: asset.height,
          format: asset.format,
          createdAt: asset.created_at,
          source: "cloudinary" as const,
        }));
      response.statusCode = 200;
      response.setHeader("Cache-Control", "private, max-age=30");
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ assets }));
    } catch {
      response.statusCode = 502;
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ error: "Cloudinary media could not be loaded." }));
    }
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
