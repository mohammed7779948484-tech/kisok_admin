import { describe, expect, it } from "vitest";
import {
  orderDetailsHref,
  ordersListHref,
} from "@/application/orders/orders-navigation";

describe("orders list state navigation", () => {
  it("preserves search, status, dates, and page in detail and back links", () => {
    const params = new URLSearchParams({
      q: "1042",
      status: "ready",
      from: "2026-08-01",
      to: "2026-08-20",
      page: "3",
    });
    const query = params.toString();
    expect(orderDetailsHref("order-id", params)).toBe(`/orders/show/order-id?${query}`);
    expect(ordersListHref(params)).toBe(`/orders?${query}`);
  });
});
