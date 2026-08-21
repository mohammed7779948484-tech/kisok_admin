export function ordersListHref(searchParams: URLSearchParams): string {
  const query = searchParams.toString();
  return `/orders${query ? `?${query}` : ""}`;
}

export function orderDetailsHref(
  orderId: string,
  searchParams: URLSearchParams,
): string {
  const query = searchParams.toString();
  return `/orders/show/${orderId}${query ? `?${query}` : ""}`;
}
