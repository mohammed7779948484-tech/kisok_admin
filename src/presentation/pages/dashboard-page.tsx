import { useList } from "@refinedev/core";
import {
  AlertTriangleIcon,
  BoxesIcon,
  CoffeeIcon,
  PackageCheckIcon,
  ShoppingBagIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  Flavor,
  InventoryAdjustment,
  InventoryRow,
  Order,
  Product,
  StoreSettings,
} from "@/domain/entities";
import { PageHeader } from "@/presentation/components/page-header";
import { OrderStatusBadge } from "@/presentation/components/status-badge";
import { ErrorState, TableSkeleton } from "@/presentation/components/states";

const pollingOptions = {
  refetchInterval: () =>
    typeof document !== "undefined" && document.visibilityState === "visible"
      ? 15_000
      : false,
};

export function DashboardPage() {
  const products = useList<Product>({
    resource: "products",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });
  const flavors = useList<Flavor>({
    resource: "flavors",
    pagination: { mode: "off" },
    filters: [{ field: "is_active", operator: "eq", value: true }],
  });
  const inventory = useList<InventoryRow>({
    resource: "inventory",
    pagination: { mode: "off" },
    meta: { select: "*,flavors(*,products(id,name))" },
    queryOptions: pollingOptions,
  });
  const settings = useList<StoreSettings>({
    resource: "store_settings",
    pagination: { mode: "off" },
  });
  const orders = useList<Order>({
    resource: "orders",
    pagination: { currentPage: 1, pageSize: 8 },
    sorters: [{ field: "created_at", order: "desc" }],
    queryOptions: pollingOptions,
  });
  const adjustments = useList<InventoryAdjustment>({
    resource: "inventory_adjustments",
    pagination: { currentPage: 1, pageSize: 6 },
    sorters: [{ field: "created_at", order: "desc" }],
    meta: { select: "*,flavors(id,name,products(id,name))" },
    queryOptions: pollingOptions,
  });

  const queries = [
    products.query,
    flavors.query,
    inventory.query,
    settings.query,
    orders.query,
    adjustments.query,
  ];
  const error = queries.find((query) => query.error)?.error as Error | undefined;
  const loading = queries.some((query) => query.isLoading);
  const threshold = settings.result.data[0]?.global_low_stock_threshold ?? 5;
  const lowStock = inventory.result.data.filter(
    (row) => row.current_quantity <= threshold,
  );
  const statusCounts = orders.result.data.reduce<Record<string, number>>(
    (counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1;
      return counts;
    },
    {},
  );

  return (
    <>
      <PageHeader
        description="Live operational overview. Active data refreshes every 15 seconds."
        title="Dashboard"
      />
      {error ? <ErrorState message={error.message} /> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          description="Available in the customer catalog"
          icon={PackageCheckIcon}
          title="Active products"
          value={products.result.total ?? products.result.data.length}
        />
        <MetricCard
          description="Orderable catalog variants"
          icon={CoffeeIcon}
          title="Active flavors"
          value={flavors.result.total ?? flavors.result.data.length}
        />
        <MetricCard
          description={`At or below ${threshold} units`}
          icon={AlertTriangleIcon}
          title="Low stock"
          value={lowStock.length}
        />
        <MetricCard
          description={`${statusCounts.new ?? 0} new · ${statusCounts.ready ?? 0} ready`}
          icon={ShoppingBagIcon}
          title="Recent orders"
          value={orders.result.total ?? orders.result.data.length}
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Low-stock inventory</CardTitle>
            <CardDescription>Variants that need attention now.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : (
              <div className="flex flex-col gap-3">
                {lowStock.slice(0, 8).map((row) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={row.flavor_id}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">
                        {row.flavors?.products?.name ?? "Product"} ·{" "}
                        {row.flavors?.name ?? "Flavor"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Updated {formatDistanceToNow(new Date(row.updated_at))} ago
                      </span>
                    </div>
                    <Badge variant={row.current_quantity === 0 ? "destructive" : "secondary"}>
                      {row.current_quantity} units
                    </Badge>
                  </div>
                ))}
                {!lowStock.length ? (
                  <p className="text-sm text-muted-foreground">
                    All inventory is above the low-stock threshold.
                  </p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent orders</CardTitle>
            <CardDescription>Most recent customer submissions.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton />
            ) : (
              <div className="flex flex-col gap-3">
                {orders.result.data.map((order) => (
                  <div
                    className="flex items-center justify-between rounded-lg border p-3"
                    key={order.id}
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">#{order.display_number}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.created_at))} ago
                      </span>
                    </div>
                    <OrderStatusBadge status={order.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Recent inventory activity</CardTitle>
          <CardDescription>Immutable audit history from stock operations.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {adjustments.result.data.map((adjustment) => (
                <div className="flex items-start gap-3 rounded-lg border p-3" key={adjustment.id}>
                  <div className="flex size-9 items-center justify-center rounded-md bg-muted">
                    <BoxesIcon />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">
                      {adjustment.flavors?.products?.name ?? "Product"} ·{" "}
                      {adjustment.flavors?.name ?? "Flavor"}
                    </span>
                    <span className="text-sm">
                      {adjustment.quantity_change > 0 ? "+" : ""}
                      {adjustment.quantity_change} → {adjustment.quantity_after}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {adjustment.adjustment_type.replaceAll("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof PackageCheckIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <CardDescription>{title}</CardDescription>
          <CardTitle className="text-3xl tabular-nums">{value}</CardTitle>
        </div>
        <Icon className="text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
