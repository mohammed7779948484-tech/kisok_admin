import { beforeEach, describe, expect, it, vi } from "vitest";

const useQuery = vi.hoisted(() => vi.fn((options) => options));
vi.mock("@tanstack/react-query", () => ({ useQuery }));
vi.mock("@/infrastructure/supabase/rpc-gateway", () => ({
  rpcGateway: { getAdminCatalogVisibility: vi.fn() },
}));

import { useCatalogVisibility } from "@/presentation/hooks/use-catalog-visibility";

describe("catalog visibility polling", () => {
  beforeEach(() => useQuery.mockClear());

  it("polls every 15 seconds while the document is visible", () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    useCatalogVisibility();
    const options = useQuery.mock.calls[0][0];
    expect(options.staleTime).toBe(15_000);
    expect(options.refetchInterval()).toBe(15_000);
  });

  it("pauses polling while the document is hidden", () => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    useCatalogVisibility();
    expect(useQuery.mock.calls[0][0].refetchInterval()).toBe(false);
  });
});
