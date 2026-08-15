import type {
  InventoryAdjustmentType,
  OrderStatus,
} from "@/domain/entities";
import { supabaseClient } from "@/infrastructure/supabase/client";
import type {
  Database,
  Json,
} from "@/infrastructure/supabase/database.types";
import { toAppError } from "@/shared/errors";

type FunctionName = keyof Database["public"]["Functions"];
type FunctionArgs<Name extends FunctionName> =
  Database["public"]["Functions"][Name]["Args"];
type FunctionResult<Name extends FunctionName> =
  Database["public"]["Functions"][Name]["Returns"];

async function rpc<Name extends FunctionName>(
  name: Name,
  args: FunctionArgs<Name>,
): Promise<FunctionResult<Name>> {
  const { data, error } = await supabaseClient.rpc(name, args);
  if (error) throw toAppError(error);
  return data as FunctionResult<Name>;
}

export const rpcGateway = {
  getAdminCatalogVisibility: () => rpc("get_admin_catalog_visibility", undefined as never),
  saveProduct: (productPayload: Record<string, unknown>, categoryIds: string[]) =>
    rpc("save_product_with_categories", {
      product_payload: productPayload as Json,
      category_ids: categoryIds,
    }),
  saveProductCatalog: (
    productPayload: Record<string, unknown>,
    categoryIds: string[],
    flavorPayloads: Array<Record<string, unknown>>,
  ) =>
    rpc("save_product_catalog", {
      product_payload: productPayload as Json,
      category_ids: categoryIds,
      flavor_payloads: flavorPayloads as Json[],
    }),
  setProductActive: (productId: string, active: boolean) =>
    rpc("set_product_active", {
      target_product_id: productId,
      active,
    }),
  createFlavor: (flavorPayload: Record<string, unknown>, initialQuantity: number) =>
    rpc("create_flavor_with_initial_stock", {
      flavor_payload: flavorPayload as Json,
      initial_quantity: initialQuantity,
    }),
  createChildCategory: (
    parentId: string,
    childPayload: Record<string, unknown>,
  ) =>
    rpc("create_child_category", {
      parent_id: parentId,
      child_payload: childPayload as Json,
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
