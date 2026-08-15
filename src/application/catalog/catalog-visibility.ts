import type { Brand, Category } from "@/domain/entities";

export interface CatalogVisibilityInput {
  productActive: boolean;
  brand?: Pick<Brand, "name" | "is_active"> | null;
  categories: Array<Pick<Category, "id" | "name" | "parent_id" | "is_active">>;
  allCategories: Array<Pick<Category, "id" | "name" | "parent_id" | "is_active">>;
}

export interface CatalogVisibility {
  visible: boolean;
  reasons: string[];
}

export function getCatalogVisibility(input: CatalogVisibilityInput): CatalogVisibility {
  const reasons: string[] = [];
  const categoryById = new Map(input.allCategories.map((category) => [category.id, category]));

  if (!input.productActive) reasons.push("Product is inactive");
  if (!input.brand) reasons.push("No brand is selected");
  else if (!input.brand.is_active) reasons.push(`Brand “${input.brand.name}” is inactive`);
  if (!input.categories.length) reasons.push("No category is assigned");

  for (const category of input.categories) {
    if (!category.is_active) reasons.push(`Category “${category.name}” is inactive`);
    const parent = category.parent_id ? categoryById.get(category.parent_id) : undefined;
    if (parent && !parent.is_active) {
      reasons.push(`Parent category “${parent.name}” is inactive`);
    }
  }

  return { visible: reasons.length === 0, reasons: [...new Set(reasons)] };
}

export function getAvailableFlavorCount(
  flavors: Array<{ is_active: boolean; initial_quantity: number }>,
) {
  return flavors.filter((flavor) => flavor.is_active && flavor.initial_quantity > 0).length;
}
