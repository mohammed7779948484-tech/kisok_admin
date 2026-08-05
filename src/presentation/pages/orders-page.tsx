import { useEffect, useMemo, useState } from "react";
import { useInvalidate, useList, useOne } from "@refinedev/core";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2Icon, EyeIcon, XCircleIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import type { Order } from "@/domain/entities";
import { rpcGateway } from "@/infrastructure/supabase/rpc-gateway";
import { toAppError } from "@/shared/errors";
import { DataTable } from "@/presentation/components/data-table";
import { PageHeader } from "@/presentation/components/page-header";
import { OrderStatusBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

export function OrdersPage({ show = false }: { show?: boolean }) {
  const navigate = useNavigate();
  const params = useParams();
  const invalidate = useInvalidate();
  const orders = useList<Order>({
    resource: "orders",
    pagination: { currentPage: 1, pageSize: 50 },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: {
      select: "id,display_number,status,created_at,updated_at,completed_at,completed_by,cancelled_at,cancelled_by,cancellation_reason,assigned_preparation_id,order_items(quantity)",
    },
    queryOptions: {
      refetchInterval: () =>
        typeof document !== "undefined" && document.visibilityState === "visible"
          ? 15_000
          : false,
    },
  });
  const orderDetail = useOne<Order>({
    resource: "orders",
    id: params.id,
    meta: {
      select: "id,display_number,status,created_at,updated_at,completed_at,completed_by,cancelled_at,cancelled_by,cancellation_reason,assigned_preparation_id,order_items(id,order_id,product_id,flavor_id,product_name,flavor_name,brand_name,image_public_id,image_secure_url,quantity)",
    },
    queryOptions: { enabled: show && Boolean(params.id) },
  });
  const current = show ? orderDetail.result : undefined;
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) {
      setCompleteOpen(false);
      setCancelOpen(false);
      setReason("");
    }
  }, [show]);

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: "display_number",
        header: "Order",
        cell: ({ row }) => <span className="font-medium">#{row.original.display_number}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        id: "items",
        header: "Items",
        cell: ({ row }) =>
          row.original.order_items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0,
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
      },
      {
        accessorKey: "updated_at",
        header: "Last update",
        cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            onClick={() => navigate(`/orders/show/${row.original.id}`)}
            size="sm"
            variant="outline"
          >
            <EyeIcon data-icon="inline-start" />
            View
          </Button>
        ),
      },
    ],
    [navigate],
  );

  const refresh = () =>
    invalidate({ resource: "orders", invalidates: ["list", "detail"] });
  const complete = async () => {
    if (!current) return;
    setSaving(true);
    try {
      await rpcGateway.completeOrder(current.id, current.status);
      await refresh();
      toast.success("Order completed.");
      setCompleteOpen(false);
      navigate("/orders");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };
  const cancel = async () => {
    if (!current || !reason.trim()) {
      toast.error("A cancellation reason is required.");
      return;
    }
    setSaving(true);
    try {
      await rpcGateway.cancelOrder(current.id, current.status, reason.trim());
      await Promise.all([
        refresh(),
        invalidate({ resource: "inventory", invalidates: ["list"] }),
        invalidate({ resource: "inventory_adjustments", invalidates: ["list"] }),
      ]);
      toast.success("Order cancelled and inventory restored when applicable.");
      setCancelOpen(false);
      navigate("/orders");
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        description="Operational order queue. Active data refreshes every 15 seconds."
        title="Orders"
      />
      {orders.query.isLoading ? <TableSkeleton /> : null}
      {orders.query.error ? (
        <ErrorState message={toAppError(orders.query.error).message} />
      ) : null}
      {show && orderDetail.query.isLoading ? <TableSkeleton /> : null}
      {show && orderDetail.query.error ? (
        <ErrorState message={toAppError(orderDetail.query.error).message} />
      ) : null}
      {!orders.query.isLoading ? (
        <DataTable
          columns={columns}
          data={orders.result.data}
          searchPlaceholder="Search order number or status..."
        />
      ) : null}
      <Sheet
        onOpenChange={(open) => {
          if (!open) navigate("/orders");
        }}
        open={show && Boolean(current) && !orderDetail.query.isLoading}
      >
        <SheetContent className="overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Order #{current?.display_number}</SheetTitle>
            <SheetDescription>
              Created {current ? new Date(current.created_at).toLocaleString() : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4">
            {current ? <OrderStatusBadge status={current.status} /> : null}
            <div className="flex flex-col gap-3">
              {current?.order_items?.map((item) => (
                <div className="flex items-center gap-3 rounded-lg border p-3" key={item.id}>
                  <img
                    alt=""
                    className="size-12 rounded-md border object-cover"
                    src={item.image_secure_url}
                  />
                  <div className="flex flex-1 flex-col gap-1">
                    <span className="font-medium">{item.product_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.brand_name} · {item.flavor_name}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">× {item.quantity}</span>
                </div>
              ))}
            </div>
            {current?.cancellation_reason ? (
              <Field>
                <FieldLabel>Cancellation reason</FieldLabel>
                <FieldDescription>{current.cancellation_reason}</FieldDescription>
              </Field>
            ) : null}
          </div>
          <SheetFooter>
            <Button onClick={() => navigate("/orders")} variant="outline">
              Close
            </Button>
            {current && !["completed", "cancelled"].includes(current.status) ? (
              <Button onClick={() => setCancelOpen(true)} variant="destructive">
                <XCircleIcon data-icon="inline-start" />
                Cancel order
              </Button>
            ) : null}
            {current?.status === "ready" ? (
              <Button onClick={() => setCompleteOpen(true)}>
                <CheckCircle2Icon data-icon="inline-start" />
                Complete order
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog onOpenChange={setCompleteOpen} open={completeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This records the current administrator and completion time. The expected status is
              sent to prevent stale updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={complete}>
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Complete order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog onOpenChange={setCancelOpen} open={cancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>
              The database operation restores deducted inventory atomically when applicable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cancel-reason">Cancellation reason</FieldLabel>
              <Input
                id="cancel-reason"
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
            </Field>
          </FieldGroup>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={cancel} variant="destructive">
              {saving ? <Spinner data-icon="inline-start" /> : null}
              Cancel order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
