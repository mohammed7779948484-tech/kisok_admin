import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MediaPicker } from "@/presentation/components/media-picker";

vi.mock("@refinedev/core", () => ({
  useInvalidate: () => vi.fn(),
}));

vi.mock("@/presentation/hooks/use-media-assets", () => ({
  saveMediaAsset: vi.fn(),
  useMediaAssets: () => ({
    assets: [
      { id: "1", publicId: "catalog/first", secureUrl: "https://example.com/1.jpg" },
      { id: "2", publicId: "catalog/second", secureUrl: "https://example.com/2.jpg" },
    ],
    error: null,
    isLoading: false,
    total: 2,
  }),
}));

vi.mock("@/presentation/components/cloudinary-upload-button", () => ({
  CloudinaryUploadButton: () => <button type="button">Upload image</button>,
}));

function Harness() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <button onClick={() => setOpen(true)} type="button">Open picker</button>
      <MediaPicker open={open} onOpenChange={setOpen} onSelect={() => undefined} />
    </>
  );
}

describe("MediaPicker dismissal", () => {
  it("clears search and selection after Escape dismissal", () => {
    render(<Harness />);
    const search = screen.getByPlaceholderText("Search by Cloudinary public ID...");
    fireEvent.change(search, { target: { value: "first" } });
    fireEvent.click(screen.getByRole("button", { name: /catalog\/first/ }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByText("Select media")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open picker" }));
    expect(screen.getByPlaceholderText("Search by Cloudinary public ID...")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Select" })).toBeDisabled();
  });
});
