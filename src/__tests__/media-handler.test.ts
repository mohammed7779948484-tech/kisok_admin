import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { createCloudinaryAssetsHandler } from "../../server/cloudinary-assets-handler";

const runtimeEnv = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  CLOUDINARY_CLOUD_NAME: "test-cloud",
  CLOUDINARY_API_KEY: "test-key",
  CLOUDINARY_API_SECRET: "test-secret",
};

function request(method: "POST" | "DELETE", publicId = "catalog/example") {
  const url = new URL("https://admin.example/api/cloudinary/assets");
  if (method === "DELETE") url.searchParams.set("publicId", publicId);
  return new Request(url, {
    method,
    headers: {
      Authorization: "Bearer admin-token",
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify({ publicId }) : undefined,
  });
}

function createSupabaseDouble({
  usage = {},
  upsertError = null,
  deleteErrors = [],
}: {
  usage?: Record<string, number>;
  upsertError?: { message: string } | null;
  deleteErrors?: Array<{ message: string } | null>;
} = {}) {
  let deleteAttempt = 0;
  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-id" } },
        error: null,
      }),
    },
    rpc: vi.fn(async (name: string) =>
      name === "current_active_profile"
        ? { data: { role: "admin", is_active: true }, error: null }
        : { data: usage, error: null },
    ),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: "media-id" },
            error: null,
          }),
        })),
      })),
      upsert: vi.fn().mockResolvedValue({ error: upsertError }),
      delete: vi.fn(() => ({
        eq: vi.fn(async () => ({
          error: deleteErrors[deleteAttempt++] ?? null,
        })),
      })),
    })),
  };
  return client as unknown as SupabaseClient;
}

function createCloudinaryDouble() {
  return {
    config: vi.fn(),
    api: {
      resource: vi.fn().mockResolvedValue({
        public_id: "catalog/example",
        secure_url: "https://res.cloudinary.com/test/catalog/example.webp",
        asset_id: "asset-id",
        width: 800,
        height: 800,
        format: "webp",
        bytes: 1200,
      }),
      delete_resources: vi.fn().mockResolvedValue({
        deleted: { "catalog/example": "deleted" },
      }),
    },
  };
}

describe("Cloudinary media failure recovery", () => {
  it("removes a new Cloudinary upload when media registration fails", async () => {
    const supabase = createSupabaseDouble({
      upsertError: { message: "database unavailable" },
    });
    const cloudinary = createCloudinaryDouble();
    const logError = vi.fn();
    const handler = createCloudinaryAssetsHandler(runtimeEnv, {
      createSupabaseClient: () => supabase,
      cloudinaryClient: cloudinary,
      logError,
    });

    const response = await handler(request("POST"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "The image could not be registered and the upload was rolled back.",
    });
    expect(cloudinary.api.delete_resources).toHaveBeenCalledWith(
      ["catalog/example"],
      expect.objectContaining({ invalidate: true }),
    );
    expect(logError).toHaveBeenCalledWith(
      "Media registration failed; compensating Cloudinary upload:",
      "catalog/example",
      "database unavailable",
    );
  });

  it("blocks deletion while the media asset is referenced", async () => {
    const supabase = createSupabaseDouble({ usage: { products: 1 } });
    const cloudinary = createCloudinaryDouble();
    const handler = createCloudinaryAssetsHandler(runtimeEnv, {
      createSupabaseClient: () => supabase,
      cloudinaryClient: cloudinary,
    });

    const response = await handler(request("DELETE"));

    expect(response.status).toBe(409);
    expect(cloudinary.api.delete_resources).not.toHaveBeenCalled();
  });

  it("repairs a stale media row when deletion is retried", async () => {
    const supabase = createSupabaseDouble({
      deleteErrors: [{ message: "temporary database failure" }, null],
    });
    const cloudinary = createCloudinaryDouble();
    cloudinary.api.delete_resources
      .mockResolvedValueOnce({ deleted: { "catalog/example": "deleted" } })
      .mockResolvedValueOnce({ deleted: { "catalog/example": "not_found" } });
    const handler = createCloudinaryAssetsHandler(runtimeEnv, {
      createSupabaseClient: () => supabase,
      cloudinaryClient: cloudinary,
      logError: vi.fn(),
    });

    const firstResponse = await handler(request("DELETE"));
    const retryResponse = await handler(request("DELETE"));

    expect(firstResponse.status).toBe(503);
    await expect(firstResponse.json()).resolves.toEqual({
      error: "The image was removed, but cleanup is incomplete. Retry deletion to repair it.",
    });
    expect(retryResponse.status).toBe(200);
    await expect(retryResponse.json()).resolves.toEqual({ success: true });
  });
});
