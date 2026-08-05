import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/presentation/components/states";

export function DataTable<TData>({
  columns,
  data,
  searchPlaceholder = "Search records...",
  pageSize = 10,
  remote,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchPlaceholder?: string;
  pageSize?: number;
  remote?: {
    page: number;
    pageSize: number;
    total: number;
    search: string;
    onPageChange: (page: number) => void;
    onSearchChange: (search: string) => void;
  };
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const stableColumns = useMemo(() => columns, [columns]);
  const table = useReactTable({
    data,
    columns: stableColumns,
    state: {
      sorting,
      globalFilter: remote?.search ?? globalFilter,
      ...(remote
        ? { pagination: { pageIndex: remote.page - 1, pageSize: remote.pageSize } }
        : {}),
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: remote ? undefined : setGlobalFilter,
    manualFiltering: Boolean(remote),
    manualPagination: Boolean(remote),
    pageCount: remote ? Math.ceil(remote.total / remote.pageSize) : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageIndex: 0, pageSize } },
  });

  return (
    <div className="flex flex-col gap-4">
      <InputGroup className="w-full sm:max-w-sm">
        <InputGroupInput
          aria-label="Search table"
          onChange={(event) =>
            remote
              ? remote.onSearchChange(event.target.value)
              : setGlobalFilter(event.target.value)
          }
          placeholder={searchPlaceholder}
          value={remote?.search ?? globalFilter}
        />
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
      </InputGroup>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow data-state={row.getIsSelected() && "selected"} key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {remote?.total ?? table.getFilteredRowModel().rows.length} record(s)
        </p>
        <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
          <Button
            aria-label="Previous page"
            disabled={remote ? remote.page <= 1 : !table.getCanPreviousPage()}
            onClick={() =>
              remote ? remote.onPageChange(remote.page - 1) : table.previousPage()
            }
            size="icon"
            variant="outline"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="text-sm">
            Page {remote?.page ?? table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </span>
          <Button
            aria-label="Next page"
            disabled={
              remote
                ? remote.page >= Math.ceil(remote.total / remote.pageSize)
                : !table.getCanNextPage()
            }
            onClick={() =>
              remote ? remote.onPageChange(remote.page + 1) : table.nextPage()
            }
            size="icon"
            variant="outline"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
}
