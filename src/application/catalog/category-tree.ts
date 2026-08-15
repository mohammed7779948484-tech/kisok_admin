import type { Category } from "@/domain/entities";

export interface CategoryGroup {
  parent: Category;
  options: Category[];
}

export function buildCategoryGroups(categories: Category[]): CategoryGroup[] {
  const childrenByParent = new Map<string, Category[]>();
  for (const category of categories) {
    if (!category.parent_id) continue;
    const children = childrenByParent.get(category.parent_id) ?? [];
    children.push(category);
    childrenByParent.set(category.parent_id, children);
  }

  return categories
    .filter((category) => !category.parent_id)
    .map((parent) => ({
      parent,
      options: childrenByParent.get(parent.id) ?? [parent],
    }));
}

export function categoryPath(category: Category, categories: Category[]) {
  const parent = category.parent_id
    ? categories.find((item) => item.id === category.parent_id)
    : undefined;
  return parent ? `${parent.name} › ${category.name}` : category.name;
}
