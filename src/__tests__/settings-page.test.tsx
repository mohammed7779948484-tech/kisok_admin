import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoreSettings } from "@/domain/entities";

const mocks = vi.hoisted(() => ({
  record: undefined as StoreSettings | undefined,
  setWarnWhen: vi.fn(),
  mutateAsync: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@refinedev/core", () => ({
  useInvalidate: () => mocks.invalidate,
  useList: ({ resource }: { resource: string }) =>
    resource === "store_settings"
      ? {
          result: { data: mocks.record ? [mocks.record] : [] },
          query: { isLoading: false, error: null },
        }
      : {
          result: { data: [] },
          query: { isLoading: false, error: null },
        },
  useUpdate: () => ({
    mutateAsync: mocks.mutateAsync,
    mutation: { isPending: false },
  }),
  useWarnAboutChange: () => ({ setWarnWhen: mocks.setWarnWhen }),
}));

import { SettingsPage } from "@/presentation/pages/settings-page";

const initialSettings: StoreSettings = {
  id: "true",
  store_name: "Kiosk Store",
  logo_public_id: null,
  logo_secure_url: null,
  global_low_stock_threshold: 5,
  customer_success_reset_seconds: 10,
  store_timezone: "America/Los_Angeles",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

afterEach(() => {
  mocks.record = undefined;
  mocks.setWarnWhen.mockClear();
  mocks.mutateAsync.mockClear();
  mocks.invalidate.mockClear();
});

describe("store settings regression protection", () => {
  it("does not overwrite a dirty form when the same singleton refetches", async () => {
    mocks.record = initialSettings;
    const view = render(<SettingsPage />);
    const storeName = screen.getByLabelText("Store name");

    fireEvent.change(storeName, { target: { value: "Local unsaved edit" } });
    await waitFor(() => expect(mocks.setWarnWhen).toHaveBeenCalledWith(true));

    mocks.record = { ...initialSettings, store_name: "Server refetch value" };
    view.rerender(<SettingsPage />);

    expect(screen.getByLabelText("Store name")).toHaveValue("Local unsaved edit");
  });

  it("shows an explicit error when the singleton is missing", () => {
    mocks.record = undefined;
    render(<SettingsPage />);

    expect(
      screen.getByText(/Store settings are not configured/),
    ).toBeVisible();
  });
});
