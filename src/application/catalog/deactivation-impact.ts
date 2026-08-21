import type { CatalogVisibilityRow, Category, Product } from "@/domain/entities";

export interface DeactivationImpact {
  products: number;
  flavors: number;
  children: number;
}

export function calculateDeactivationImpact({
  targetId,
  kind,
  categories,
  products,
  visibility,
}: {
  targetId: string;
  kind: "brands" | "categories";
  categories: Category[];
  products: Product[];
  visibility: CatalogVisibilityRow[];
}): DeactivationImpact {
  const affectedCategoryIds = new Set<string>();
  const activeChildren =
    kind === "categories"
      ? categories.filter(
          (category) => category.parent_id === targetId && category.is_active,
        )
      : [];

  if (kind === "categories") {
    affectedCategoryIds.add(targetId);
    activeChildren.forEach((category) => affectedCategoryIds.add(category.id));
  }

  const visibilityByProduct = new Map(
    visibility.map((row) => [row.product_id, row]),
  );
  const affectedProducts = products.filter((product) => {
    if (!product.is_active) return false;
    const currentVisibility = visibilityByProduct.get(product.id);
    if (!currentVisibility?.product_visible) return false;
    return kind === "brands"
      ? product.brand_id === targetId
      : product.product_categories?.some((link) =>
          affectedCategoryIds.has(link.category_id),
        );
  });

  return {
    products: affectedProducts.length,
    flavors: affectedProducts.reduce(
      (sum, product) =>
        sum + Number(visibilityByProduct.get(product.id)?.active_flavor_count ?? 0),
      0,
    ),
    children: activeChildren.length,
  };
}
