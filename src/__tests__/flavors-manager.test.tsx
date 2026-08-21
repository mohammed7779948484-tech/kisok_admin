import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FlavorsManager } from "@/presentation/features/products/product-editor-sections";
import type { ProductForm } from "@/presentation/features/products/product-form-model";

const baseForm: ProductForm = {
  name: "Product",
  brand_id: "brand",
  cover_public_id: "",
  cover_secure_url: "",
  short_description: "",
  search_keywords: null,
  display_order: 0,
  is_active: true,
  category_ids: ["category"],
  flavors: [
    {
      id: "flavor-1",
      name: "Vanilla",
      main_image_public_id: "catalog/vanilla",
      main_image_secure_url: "https://example.com/vanilla.jpg",
      search_keywords: null,
      display_order: 0,
      is_featured: true,
      is_active: true,
      initial_quantity: 10,
    },
  ],
};

describe("flavor editor safeguards", () => {
  it("uses the same confirmation for the Active switch and Deactivate button", () => {
    const onChange = vi.fn();
    render(
      <FlavorsManager form={baseForm} readonly={false} onChange={onChange} onPickImage={() => undefined} />,
    );
    fireEvent.click(screen.getAllByRole("switch")[0]);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Deactivate this flavor?")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate flavor" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        flavors: [expect.objectContaining({ is_active: false, is_featured: false })],
      }),
    );
  });

  it("keeps only one featured flavor in the form", () => {
    const onChange = vi.fn();
    const form = {
      ...baseForm,
      flavors: [
        baseForm.flavors[0],
        { ...baseForm.flavors[0], id: "flavor-2", name: "Mint", is_featured: false },
      ],
    };
    render(
      <FlavorsManager form={form} readonly={false} onChange={onChange} onPickImage={() => undefined} />,
    );
    fireEvent.click(screen.getAllByRole("switch")[3]);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        flavors: [
          expect.objectContaining({ id: "flavor-1", is_featured: false }),
          expect.objectContaining({ id: "flavor-2", is_featured: true }),
        ],
      }),
    );
  });
});
