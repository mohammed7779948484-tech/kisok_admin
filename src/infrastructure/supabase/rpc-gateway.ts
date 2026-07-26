import type {
  InventoryAdjustmentType,
  OrderStatus,
} from "@/domain/entities";
import { supabaseClient } from "@/infrastructure/supabase/client";
import { toAppError } from "@/shared/errors";

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseClient.rpc(name, args);
  if (error) throw toAppError(error);
  return data as T;
}

export const rpcGateway = {
  saveProduct: (productPayload: Record<string, unknown>, categoryIds: string[]) =>
    rpc("save_product_with_categories", {
      product_payload: productPayload,
      category_ids: categoryIds,
    }),
  createFlavor: (flavorPayload: Record<string, unknown>, initialQuantity: number) =>
    rpc("create_flavor_with_initial_stock", {
      flavor_payload: flavorPayload,
      initial_quantity: initialQuantity,
    }),
  createChildCategory: (
    parentId: string,
    childPayload: Record<string, unknown>,
  ) =>
    rpc("create_child_category", {
      parent_id: parentId,
      child_payload: childPayload,
    }),
  adjustInventory: (input: {
    flavorId: string;
    type: InventoryAdjustmentType;
    delta: number;
    reason: string;
  }) =>
    rpc("apply_inventory_adjustment", {
      flavor_id: input.flavorId,
      type: input.type,
      delta: input.delta,
      reason: input.reason,
    }),
  setInventoryQuantity: (input: {
    flavorId: string;
    finalQuantity: number;
    reason: string;
  }) =>
    rpc("set_inventory_quantity", {
      flavor_id: input.flavorId,
      final_quantity: input.finalQuantity,
      reason: input.reason,
    }),
  completeOrder: (orderId: string, expectedStatus: OrderStatus) =>
    rpc("complete_order", {
      order_id: orderId,
      expected_status: expectedStatus,
    }),
  cancelOrder: (orderId: string, expectedStatus: OrderStatus, reason: string) =>
    rpc("cancel_order", {
      order_id: orderId,
      expected_status: expectedStatus,
      reason,
    }),
};
