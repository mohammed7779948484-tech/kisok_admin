import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/domain/entities";

const labels: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function ActiveBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? "default" : "secondary"}>
      {active ? "Active" : "Inactive"}
    </Badge>
  );
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={status === "cancelled" ? "destructive" : "secondary"}>
      {labels[status]}
    </Badge>
  );
}
