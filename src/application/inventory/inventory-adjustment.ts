import type { InventoryAdjustmentType } from "@/domain/entities";

export function validateInventoryAdjustment({
  mode,
  quantity,
  reason,
}: {
  mode: "adjust" | "set";
  quantity: number;
  reason: string;
}) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    return "Enter a nonnegative whole-number quantity.";
  }
  if (mode === "adjust" && quantity === 0) {
    return "An inventory adjustment must be greater than zero.";
  }
  if (!reason.trim()) return "An inventory adjustment reason is required.";
  return null;
}

export function toSignedInventoryDelta(
  type: InventoryAdjustmentType,
  quantity: number,
) {
  return type === "manual_decrease" || type === "damaged_or_expired"
    ? -Math.abs(quantity)
    : Math.abs(quantity);
}
