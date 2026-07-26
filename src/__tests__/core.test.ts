import { beforeEach, describe, expect, it, vi } from "vitest";
import { canAccessAdmin } from "@/application/policies/admin-access";
import { parsePublicEnv } from "@/shared/env";
import { toAppError } from "@/shared/errors";

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
});
