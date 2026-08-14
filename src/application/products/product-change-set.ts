import type { Flavor, Product } from "@/domain/entities";

export interface ProductDraft {
  name: string;
  brand_id: string;
  cover_public_id: string;
  cover_secure_url: string;
  short_description: string;
  search_keywords?: string[] | null;
  display_order: number;
  is_active: boolean;
  category_ids: string[];
}

export interface FlavorDraft {
  name: string;
  main_image_public_id: string;
  main_image_secure_url: string;
  search_keywords?: string[] | null;
  display_order: number;
  is_featured: boolean;
  is_active: boolean;
}

function sameIds(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  const rightIds = new Set(right);
  return left.every((id) => rightIds.has(id));
}

function sameKeywords(left: string[] | null, right: string[] | null) {
  return sameIds(left ?? [], right ?? []);
}

export function hasProductChanges(draft: ProductDraft, product: Product) {
  const categoryIds =
    product.product_categories?.map((link) => link.category_id) ?? [];

  return (
    draft.name.trim() !== product.name ||
    draft.brand_id !== product.brand_id ||
    (draft.cover_public_id.trim() || null) !== product.cover_public_id ||
    (draft.cover_secure_url.trim() || null) !== product.cover_secure_url ||
    (draft.short_description.trim() || null) !== product.short_description ||
    (draft.search_keywords !== undefined &&
      !sameKeywords(draft.search_keywords, product.search_keywords)) ||
    draft.display_order !== product.display_order ||
    draft.is_active !== product.is_active ||
    !sameIds(draft.category_ids, categoryIds)
  );
}

export function hasFlavorChanges(draft: FlavorDraft, flavor: Flavor) {
  return (
    draft.name.trim() !== flavor.name ||
    draft.main_image_public_id.trim() !== flavor.main_image_public_id ||
    draft.main_image_secure_url.trim() !== flavor.main_image_secure_url ||
    (draft.search_keywords !== undefined &&
      !sameKeywords(draft.search_keywords, flavor.search_keywords)) ||
    draft.display_order !== flavor.display_order ||
    draft.is_featured !== flavor.is_featured ||
    draft.is_active !== flavor.is_active
  );
}
