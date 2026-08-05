import { useMemo, useState } from "react";
import { useInvalidate, useList } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import { BoxesIcon, HistoryIcon, SlidersHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type {
  InventoryAdjustment,
  InventoryAdjustmentType,
  InventoryRow,
  StoreSettings,
} from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

const adjustmentTypes: InventoryAdjustmentType[] = [
  "stock_received",
  "manual_increase",
  "manual_decrease",
  "damaged_or_expired",
];

export function InventoryPage() {
  const invalidate = useInvalidate();
  const inventory = useList<InventoryRow>({
    resource: "inventory",
    pagination: { mode: "off" },
    sorters: [{ field: "updated_at", order: "desc" }],
    meta: {
      select: "flavor_id,current_quantity,created_at,updated_at,flavors(id,product_id,name,main_image_public_id,main_image_secure_url,display_order,is_featured,is_active,created_at,updated_at,products(id,name))",
    },
  });
  const adjustments = useList<InventoryAdjustment>({
    resource: "inventory_adjustments",
    pagination: { currentPage: 1, pageSize: 100 },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "id,flavor_id,quantity_change,quantity_before,quantity_after,adjustment_type,reason,created_by,created_at,order_id,flavors(id,name,products(id,name))",
    },
  });
  const settings = useList<StoreSettings>({
    resource: "store_settings",
    pagination: { mode: "off" },
    meta: { select: "id,global_low_stock_threshold" },
  });
  const [target, setTarget] = useState<InventoryRow | null>(null);
  const [tab, setTab] = useState("adjust");
  const [type, setType] =
    useState<InventoryAdjustmentType>("stock_received");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const threshold = settings.result.data[0]?.global_low_stock_threshold ?? 5;

  const columns = useMemo<ColumnDef<InventoryRow>[]>(
    () => [
      {
        id: "variant",
        header: "Variant",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">
              {row.original.flavors?.products?.name ?? "Product"}
            </span>
            <span className="text-xs text-muted-foreground">
              {row.original.flavors?.name ?? "Flavor"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "current_quantity",
        header: "Quantity",
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {row.original.current_quantity}
          </span>
        ),
      },
      {
        id: "threshold",
        header: "Stock state",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.current_quantity === 0
                ? "destructive"
                : row.original.current_quantity <= threshold
                  ? "secondary"
                  : "default"
            }
          >
            {row.original.current_quantity === 0
              ? "Out of stock"
              : row.original.current_quantity <= threshold
                ? "Low stock"
                : "Healthy"}
          </Badge>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Last updated",
        cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button onClick={() => setTarget(row.original)} size="sm" variant="outline">
            <SlidersHorizontalIcon data-icon="inline-start" />
            Adjust
          </Button>
        ),
      },
    ],
    [threshold],
  );

  const historyColumns = useMemo<ColumnDef<InventoryAdjustment>[]>(
    () => [
      {
        id: "variant",
        header: "Variant",
        cell: ({ row }) =>
          `${row.original.flavors?.products?.name ?? "Product"} · ${
            row.original.flavors?.name ?? "Flavor"
          }`,
      },
      {
        accessorKey: "adjustment_type",
        header: "Type",
        cell: ({ row }) => row.original.adjustment_type.replaceAll("_", " "),
      },
      {
        accessorKey: "quantity_change",
        header: "Change",
        cell: ({ row }) =>
          `${row.original.quantity_change > 0 ? "+" : ""}${row.original.quantity_change}`,
      },
      { accessorKey: "quantity_after", header: "Result" },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => row.original.reason || "—",
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
    ],
    [],
  );

  const submit = async () => {
    if (!target || quantity < 0 || !reason.trim()) {
      toast.error("Enter a valid quantity and a reason.");
      return;
    }
    setSaving(true);
    try {
      if (tab === "set") {
        await rpcGateway.setInventoryQuantity({
          flavorId: target.flavor_id,
          finalQuantity: quantity,
          reason: reason.trim(),
        });
      } else {
        const signedDelta =
          type === "manual_decrease" || type === "damaged_or_expired"
            ? -Math.abs(quantity)
            : Math.abs(quantity);
        if (signedDelta === 0) throw new Error("Adjustment must not be zero.");
        await rpcGateway.adjustInventory({
          flavorId: target.flavor_id,
          type,
          delta: signedDelta,
          reason: reason.trim(),
        });
      }
      await Promise.all([
        invalidate({ resource: "inventory", invalidates: ["list"] }),
        invalidate({ resource: "inventory_adjustments", invalidates: ["list"] }),
      ]);
      toast.success("Inventory updated and audit history recorded.");
      setTarget(null);
      setReason("");
      setQuantity(1);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const error = inventory.query.error || adjustments.query.error || settings.query.error;
  const loading =
    inventory.query.isLoading || adjustments.query.isLoading || settings.query.isLoading;

  return (
    <>
      <PageHeader
        description={`Current stock, low-stock threshold (${threshold}), and immutable adjustment history.`}
        title="Inventory"
      />
      {error ? <ErrorState message={toAppError(error).message} /> : null}
      {loading ? <TableSkeleton /> : null}
      {!loading ? (
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">
              <BoxesIcon />
              Current stock
            </TabsTrigger>
            <TabsTrigger value="history">
              <HistoryIcon />
              Adjustment history
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stock">
            <DataTable columns={columns} data={inventory.result.data} />
          </TabsContent>
          <TabsContent value="history">
            <DataTable
              columns={historyColumns}
              data={adjustments.result.data}
              searchPlaceholder="Search adjustment history..."
            />
          </TabsContent>
        </Tabs>
      ) : null}
      <Dialog
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        open={Boolean(target)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust inventory</DialogTitle>
            <DialogDescription>
              {target?.flavors?.products?.name} · {target?.flavors?.name}. Current quantity:{" "}
              {target?.current_quantity}
            </DialogDescription>
          </DialogHeader>
          <Tabs onValueChange={setTab} value={tab}>
            <TabsList>
              <TabsTrigger value="adjust">Apply change</TabsTrigger>
              <TabsTrigger value="set">Set final quantity</TabsTrigger>
            </TabsList>
            <TabsContent value="adjust">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="adjustment-type">Adjustment type</FieldLabel>
                  <NativeSelect
                    id="adjustment-type"
                    onChange={(event) =>
                      setType(event.target.value as InventoryAdjustmentType)
                    }
                    value={type}
                  >
                    {adjustmentTypes.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value.replaceAll("_", " ")}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </FieldGroup>
            </TabsContent>
            <TabsContent value="set">
              <FieldDescription>
                This records the calculated difference as a manual adjustment.
              </FieldDescription>
            </TabsContent>
          </Tabs>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="inventory-quantity">
                {tab === "set" ? "Final quantity" : "Quantity"}
              </FieldLabel>
              <Input
                id="inventory-quantity"
                min={tab === "set" ? 0 : 1}
                onChange={(event) => setQuantity(Number(event.target.value))}
                type="number"
                value={quantity}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inventory-reason">Reason</FieldLabel>
              <Input
                id="inventory-reason"
                onChange={(event) => setReason(event.target.value)}
                placeholder="Explain why stock changed"
                value={reason}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button onClick={() => setTarget(null)} variant="outline">
              Cancel
            </Button>
            <Button disabled={saving} onClick={submit}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              {saving ? "Updating..." : "Update inventory"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
