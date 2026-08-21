import { describe, expect, it } from "vitest";
import {
  nextStoreDateStartUtc,
  storeDateStartUtc,
} from "@/shared/date-time";

describe("store-local date boundaries", () => {
  it("uses the store timezone across the spring DST transition", () => {
    expect(storeDateStartUtc("2026-03-08", "America/Los_Angeles")).toBe(
      "2026-03-08T08:00:00.000Z",
    );
    expect(nextStoreDateStartUtc("2026-03-08", "America/Los_Angeles")).toBe(
      "2026-03-09T07:00:00.000Z",
    );
  });

  it("does not use the administrator device timezone", () => {
    expect(storeDateStartUtc("2026-08-20", "Asia/Riyadh")).toBe(
      "2026-08-19T21:00:00.000Z",
    );
  });
});
