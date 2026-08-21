export function formatStoreDateTime(value: string | Date, timeZone?: string | null) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    ...(timeZone ? { timeZone } : {}),
  }).format(typeof value === "string" ? new Date(value) : value);
}

function zonedParts(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function storeDateStartUtc(date: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Date must use YYYY-MM-DD format.");
  const target = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let instant = target;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = zonedParts(new Date(instant), timeZone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = target - represented;
    instant += correction;
    if (correction === 0) break;
  }
  return new Date(instant).toISOString();
}

export function nextStoreDateStartUtc(date: string, timeZone: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error("Date must use YYYY-MM-DD format.");
  const next = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + 1));
  const nextDate = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
  return storeDateStartUtc(nextDate, timeZone);
}
