import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InventoryRow } from "@/domain/entities";
import {
  toSignedInventoryDelta,
  validateInventoryAdjustment,
} from "@/application/inventory/inventory-adjustment";

const inventoryRows: InventoryRow[] = ["vanilla", "mint"].map((name, index) => ({
  flavor_id: `flavor-${index}`,
  current_quantity: 10 + index,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  flavors: {
    id: `flavor-${index}`,
    product_id: `product-${index}`,
    name,
    main_image_public_id: `catalog/${name}`,
    main_image_secure_url: `https://example.com/${name}.webp`,
    search_keywords: null,
    display_order: index,
    is_featured: false,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    products: { id: `product-${index}`, name: `Product ${index + 1}`, is_active: true },
  },
}));

vi.mock("@refinedev/core", () => ({
  useInvalidate: () => vi.fn(),
  useList: ({ resource }: { resource: string }) => {
    const data =
      resource === "inventory"
        ? inventoryRows
        : resource === "store_settings"
          ? [
              {
                id: "true",
                global_low_stock_threshold: 5,
                store_timezone: "America/Los_Angeles",
              },
            ]
          : [];
    return {
      result: { data, total: data.length },
      query: { isLoading: false, error: null },
    };
  },
}));

import { InventoryPage } from "@/presentation/pages/inventory-page";

describe("inventory adjustment dialog", () => {
  it("rejects invalid quantities and reasons before calling inventory RPCs", () => {
    expect(
      validateInventoryAdjustment({ mode: "adjust", quantity: 0, reason: "Count" }),
    ).toContain("greater than zero");
    expect(
      validateInventoryAdjustment({ mode: "set", quantity: -1, reason: "Count" }),
    ).toContain("nonnegative");
    expect(
      validateInventoryAdjustment({ mode: "set", quantity: 0, reason: "" }),
    ).toContain("reason");
    expect(toSignedInventoryDelta("manual_decrease", 3)).toBe(-3);
    expect(toSignedInventoryDelta("stock_received", 3)).toBe(3);
  });

  it("starts clean for every selected flavor", () => {
    render(<InventoryPage />);
    const adjustButtons = screen.getAllByRole("button", { name: "Adjust" });
    expect(adjustButtons).toHaveLength(2);

    fireEvent.click(adjustButtons[0]);
    let dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Adjustment type"), {
      target: { value: "manual_decrease" },
    });
    fireEvent.change(within(dialog).getByLabelText("Quantity"), {
      target: { value: "7" },
    });
    fireEvent.change(within(dialog).getByLabelText("Reason"), {
      target: { value: "First adjustment" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    fireEvent.click(adjustButtons[1]);
    dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Adjustment type")).toHaveValue(
      "stock_received",
    );
    expect(within(dialog).getByLabelText("Quantity")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Reason")).toHaveValue("");
  });
});
