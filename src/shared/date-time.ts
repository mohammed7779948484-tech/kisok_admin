export function formatStoreDateTime(value: string | Date, timeZone?: string | null) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(typeof value === "string" ? new Date(value) : value);
}
