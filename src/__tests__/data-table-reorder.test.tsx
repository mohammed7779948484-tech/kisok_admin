import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DataTable } from "@/presentation/components/data-table";

describe("DataTable drag ordering", () => {
  it("reports deterministic row IDs after a drop", () => {
    const onReorder = vi.fn();
    render(
      <DataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={[
          { id: "first", name: "First" },
          { id: "second", name: "Second" },
        ]}
        reorder={{ getId: (row) => row.id, onReorder }}
      />,
    );

    const handles = screen.getAllByRole("button", { name: "Drag to reorder" });
    fireEvent.dragStart(handles[0]);
    fireEvent.dragOver(screen.getByText("Second").closest("tr")!);
    fireEvent.drop(screen.getByText("Second").closest("tr")!);

    expect(onReorder).toHaveBeenCalledWith(["second", "first"]);
  });
});
