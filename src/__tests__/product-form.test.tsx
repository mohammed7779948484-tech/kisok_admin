import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Category, Product } from "@/domain/entities";
import { buildCategoryGroups, categoryPath } from "@/application/catalog/category-tree";
import {
  createProductForm,
  canSaveProductEditor,
  shouldHydrateProductForm,
} from "@/presentation/features/products/product-form-model";
import { CategoryPicker } from "@/presentation/features/products/category-picker";
import { getCatalogVisibility } from "@/application/catalog/catalog-visibility";
import { calculateDeactivationImpact } from "@/application/catalog/deactivation-impact";

const categories: Category[] = [
  {
    id: "drinks",
    name: "Drinks",
    parent_id: null,
    image_public_id: null,
    image_secure_url: null,
    display_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "hot",
    name: "Hot Drinks",
    parent_id: "drinks",
    image_public_id: null,
    image_secure_url: null,
    display_order: 0,
    is_active: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "legacy",
    name: "Legacy Drinks",
    parent_id: "drinks",
    image_public_id: null,
    image_secure_url: null,
    display_order: 1,
    is_active: false,
    created_at: "",
    updated_at: "",
  },
];

function PickerHarness({ referenceData }: { referenceData: Category[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  return (
    <CategoryPicker
      allowInactiveSelection={false}
      categories={referenceData}
      onChange={setSelectedIds}
      readonly={false}
      selectedIds={selectedIds}
    />
  );
}

describe("product editor state", () => {
  it("creates independent initial forms", () => {
    const first = createProductForm();
    first.name = "Edited";
    first.flavors[0].name = "Vanilla";
    expect(createProductForm()).toMatchObject({ name: "", flavors: [{ name: "" }] });
  });

  it("hydrates each product route once and ignores reference-data refetches", () => {
    expect(
      shouldHydrateProductForm({
        mode: "create",
        routeKey: "create:",
        hydratedRouteKey: "create:",
        editDataReady: true,
      }),
    ).toBe(false);
    expect(
      shouldHydrateProductForm({
        mode: "edit",
        routeKey: "edit:product-id",
        hydratedRouteKey: null,
        editDataReady: false,
      }),
    ).toBe(false);
    expect(
      shouldHydrateProductForm({
        mode: "edit",
        routeKey: "edit:product-id",
        hydratedRouteKey: null,
        editDataReady: true,
      }),
    ).toBe(true);
    expect(
      shouldHydrateProductForm({
        mode: "edit",
        routeKey: "edit:product-id",
        hydratedRouteKey: "edit:product-id",
        editDataReady: true,
      }),
    ).toBe(false);
  });

  it("blocks Product Edit save until flavors load successfully", () => {
    expect(canSaveProductEditor("edit", false)).toBe(false);
    expect(canSaveProductEditor("edit", true)).toBe(true);
    expect(canSaveProductEditor("create", false)).toBe(true);
  });

  it("builds leaf-only hierarchical category groups and paths", () => {
    const groups = buildCategoryGroups(categories);
    expect(groups[0].parent.name).toBe("Drinks");
    expect(groups[0].options.map((item) => item.id)).toEqual(["hot", "legacy"]);
    expect(categoryPath(categories[1], categories)).toBe("Drinks › Hot Drinks");
  });

  it("keeps category selection after reference data rerenders", () => {
    const view = render(<PickerHarness referenceData={categories} />);
    const option = screen.getByText("Hot Drinks").closest("label");
    expect(option).toBeTruthy();
    fireEvent.click(option!);
    expect(screen.getByText("1 categories selected")).toBeVisible();

    view.rerender(<PickerHarness referenceData={[...categories]} />);
    expect(screen.getByText("1 categories selected")).toBeVisible();
    expect(screen.queryByText("Legacy Drinks")).not.toBeInTheDocument();
  });

  it("keeps an inactive legacy assignment visible while preventing new inactive choices", () => {
    render(
      <CategoryPicker
        allowInactiveSelection
        categories={categories}
        onChange={() => undefined}
        readonly={false}
        selectedIds={["legacy"]}
      />,
    );
    expect(screen.getByText("Legacy Drinks")).toBeVisible();
    expect(screen.getByText("Inactive")).toBeVisible();
  });

  it("explains dependency-based customer visibility", () => {
    const visibility = getCatalogVisibility({
      productActive: true,
      brand: { name: "Archived Brand", is_active: false },
      categories: [categories[1]],
      allCategories: categories.map((category) =>
        category.id === "drinks" ? { ...category, is_active: false } : category,
      ),
    });
    expect(visibility.visible).toBe(false);
    expect(visibility.reasons).toContain("Brand “Archived Brand” is inactive");
    expect(visibility.reasons).toContain("Parent category “Drinks” is inactive");
  });

  it("counts only currently customer-visible records in deactivation impact", () => {
    const impact = calculateDeactivationImpact({
      targetId: "drinks",
      kind: "categories",
      categories,
      products: [
        {
          id: "visible-product",
          brand_id: "brand-id",
          is_active: true,
          product_categories: [{ category_id: "hot" }],
        },
        {
          id: "already-hidden-product",
          brand_id: "brand-id",
          is_active: true,
          product_categories: [{ category_id: "hot" }],
        },
      ] as Product[],
      visibility: [
        {
          product_id: "visible-product",
          product_visible: true,
          hidden_reasons: [],
          active_flavor_count: 3,
          orderable_flavor_count: 2,
          low_stock_flavor_count: 1,
          total_flavor_count: 3,
        },
        {
          product_id: "already-hidden-product",
          product_visible: false,
          hidden_reasons: ["Brand is inactive"],
          active_flavor_count: 5,
          orderable_flavor_count: 5,
          low_stock_flavor_count: 0,
          total_flavor_count: 5,
        },
      ],
    });

    expect(impact).toEqual({ products: 1, flavors: 3, children: 1 });
  });
});
