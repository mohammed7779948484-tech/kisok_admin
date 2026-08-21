import { useQuery } from "@tanstack/react-query";
import type { CatalogVisibilityRow } from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";

export function useCatalogVisibility({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<CatalogVisibilityRow[]>({
    queryKey: ["admin-catalog-visibility"],
    queryFn: async () => (await rpcGateway.getAdminCatalogVisibility()) as CatalogVisibilityRow[],
    enabled,
    staleTime: 15_000,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible"
        ? 15_000
        : false,
  });
}
