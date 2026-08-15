import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAccessAdmin } from "@/application/policies/admin-access";
import {
  hasFlavorChanges,
  hasProductChanges,
} from "@/application/products/product-change-set";
import { parsePublicEnv } from "@/shared/public-env-schema";
import { AppError, toAppError } from "@/shared/errors";

const rpc = vi.fn();

vi.mock("@/infrastructure/supabase/client", () => ({
  supabaseClient: { rpc },
}));

describe("critical application boundaries", () => {
  beforeEach(() => rpc.mockReset());

  it("accepts only the public Supabase browser configuration", () => {
    expect(
      parsePublicEnv({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    ).toEqual({
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    });
    expect(() =>
      parsePublicEnv({
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_forbidden",
      }),
    ).toThrow();
  });

  it("grants application access only to active administrators", () => {
    expect(
      canAccessAdmin({
        id: "1",
        display_name: "Admin",
        role: "admin",
        is_active: true,
      }),
    ).toBe(true);
    expect(
      canAccessAdmin({
        id: "2",
        display_name: "Inactive",
        role: "admin",
        is_active: false,
      }),
    ).toBe(false);
    expect(
      canAccessAdmin({
        id: "3",
        display_name: "Customer",
        role: "customer",
        is_active: true,
      }),
    ).toBe(false);
  });

  it("maps dependency failures to a safe deactivation hint", () => {
    const error = toAppError({ code: "23503", message: "foreign key violation" });
    expect(error.statusCode).toBe(409);
    expect(error.message).toContain("Deactivate");
  });

  it("keeps the administrator session after an authorization failure", async () => {
    const { authProvider } = await import("@/infrastructure/supabase/auth-provider");
    await expect(authProvider.onError?.(new AppError("Forbidden", 403))).resolves.toEqual({
      error: expect.objectContaining({ statusCode: 403 }),
    });
    await expect(authProvider.onError?.(new AppError("Expired", 401))).resolves.toEqual({
      logout: true,
      redirectTo: "/login",
      error: expect.objectContaining({ statusCode: 401 }),
    });
  });

  it("skips unchanged product and flavor writes", () => {
    const product = {
      id: "product-id",
      name: "Coffee",
      brand_id: "brand-id",
      cover_public_id: null,
      cover_secure_url: null,
      short_description: null,
      search_keywords: ["coffee", "iced"],
      display_order: 1,
      is_active: true,
      created_at: "",
      updated_at: "",
      product_categories: [{ category_id: "category-id" }],
    };
    const flavor = {
      id: "flavor-id",
      product_id: product.id,
      name: "Vanilla",
      main_image_public_id: "flavors/vanilla",
      main_image_secure_url: "https://example.com/vanilla.png",
      search_keywords: ["vanilla"],
      display_order: 1,
      is_featured: false,
      is_active: true,
      created_at: "",
      updated_at: "",
    };

    expect(
      hasProductChanges(
        {
          name: "Coffee",
          brand_id: "brand-id",
          cover_public_id: "",
          cover_secure_url: "",
          short_description: "",
          search_keywords: ["coffee", "iced"],
          display_order: 1,
          is_active: true,
          category_ids: ["category-id"],
        },
        product,
      ),
    ).toBe(false);
    expect(
      hasFlavorChanges(
        {
          name: "Vanilla",
          main_image_public_id: "flavors/vanilla",
          main_image_secure_url: "https://example.com/vanilla.png",
          display_order: 1,
          search_keywords: ["vanilla"],
          is_featured: false,
          is_active: true,
        },
        flavor,
      ),
    ).toBe(false);
    expect(
      hasFlavorChanges(
        {
          name: "Vanilla",
          main_image_public_id: "flavors/vanilla",
          main_image_secure_url: "https://example.com/vanilla.png",
          display_order: 2,
          search_keywords: ["vanilla"],
          is_featured: false,
          is_active: true,
        },
        flavor,
      ),
    ).toBe(true);
  });

  it("preserves the inventory RPC contract", async () => {
    rpc.mockResolvedValueOnce({ data: { quantity_after: 8 }, error: null });
    const { rpcGateway } = await import("@/infrastructure/supabase/rpc-gateway");
    await rpcGateway.adjustInventory({
      flavorId: "flavor-id",
      type: "manual_increase",
      delta: 3,
      reason: "Delivery",
    });
    expect(rpc).toHaveBeenCalledWith("apply_inventory_adjustment", {
      flavor_id: "flavor-id",
      type: "manual_increase",
      delta: 3,
      reason: "Delivery",
    });
  });

  it("uses the aggregate catalog RPC without clearing generated keywords", async () => {
    rpc.mockResolvedValueOnce({
      data: [{ product_id: "product-id", created: true }],
      error: null,
    });
    const { rpcGateway } = await import("@/infrastructure/supabase/rpc-gateway");
    await rpcGateway.saveProductCatalog(
      {
        name: "Coffee",
        brand_id: "brand-id",
        search_keywords: ["coffee", "iced"],
      },
      ["category-id"],
      [
        {
          name: "Vanilla",
          search_keywords: ["vanilla"],
        },
      ],
    );
    expect(rpc).toHaveBeenCalledWith("save_product_catalog", {
      product_payload: {
        name: "Coffee",
        brand_id: "brand-id",
        search_keywords: ["coffee", "iced"],
      },
      category_ids: ["category-id"],
      flavor_payloads: [
        {
          name: "Vanilla",
          search_keywords: ["vanilla"],
        },
      ],
    });
  });
});
