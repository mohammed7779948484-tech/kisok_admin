import { useQuery } from "@tanstack/react-query";
import type { CatalogVisibilityRow } from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";

export function useCatalogVisibility() {
  return useQuery<CatalogVisibilityRow[]>({
    queryKey: ["admin-catalog-visibility"],
    queryFn: async () => (await rpcGateway.getAdminCatalogVisibility()) as CatalogVisibilityRow[],
    staleTime: 15_000,
  });
}
