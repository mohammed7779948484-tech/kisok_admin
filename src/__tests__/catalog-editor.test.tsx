import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Brand } from "@/domain/entities";

const mocks = vi.hoisted(() => ({
  record: undefined as Brand | undefined,
  dirty: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mocks.navigate,
  useParams: () => ({ id: "brand-id" }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@refinedev/core", () => ({
  useInvalidate: () => vi.fn(),
  useCreate: () => ({ mutateAsync: vi.fn(), mutation: { isPending: false } }),
  useUpdate: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    mutation: { isPending: false },
  }),
  useList: ({ resource }: { resource: string }) => ({
    result: { data: resource === "brands" && mocks.record ? [mocks.record] : [], total: 0 },
    query: { isLoading: false, error: null },
  }),
}));

vi.mock("@/presentation/hooks/use-catalog-visibility", () => ({
  useCatalogVisibility: () => ({ data: [], isLoading: false, error: null }),
}));

vi.mock("@/presentation/hooks/use-unsaved-changes-warning", () => ({
  useUnsavedChangesWarning: (dirty: boolean) => mocks.dirty(dirty),
}));

vi.mock("@/presentation/components/media-picker", () => ({
  MediaPicker: () => null,
}));

import { CatalogDirectPage } from "@/presentation/pages/catalog-direct-page";

const brand: Brand = {
  id: "brand-id",
  name: "Original brand",
  image_public_id: null,
  image_secure_url: null,
  display_order: 0,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  mocks.record = undefined;
  mocks.dirty.mockClear();
  mocks.navigate.mockClear();
});

describe("brand/category editor safeguards", () => {
  it("keeps dirty edits across list refetches", async () => {
    mocks.record = brand;
    const view = render(<CatalogDirectPage kind="brands" mode="edit" />);
    const name = screen.getByLabelText("Name");
    fireEvent.change(name, { target: { value: "Unsaved local name" } });
    await waitFor(() => expect(mocks.dirty).toHaveBeenCalledWith(true));

    mocks.record = { ...brand, name: "Server refetch name" };
    view.rerender(<CatalogDirectPage kind="brands" mode="edit" />);
    expect(screen.getByLabelText("Name")).toHaveValue("Unsaved local name");
  });

  it("routes the edit Active switch through impact confirmation", () => {
    mocks.record = brand;
    render(<CatalogDirectPage kind="brands" mode="edit" />);
    const active = screen.getByRole("switch", { name: "Active" });
    fireEvent.click(active);
    expect(active).toBeChecked();
    expect(screen.getByText("Deactivate Original brand?")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Deactivate" }));
    expect(active).not.toBeChecked();
  });
});
