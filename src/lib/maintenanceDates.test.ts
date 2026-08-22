import { describe, it, expect } from "vitest";
import { parseDateOnly, formatDateOnly, formatYYYYMMDD, seasonForDate } from "./maintenanceDates";

describe("parseDateOnly", () => {
  it("round-trips through formatDateOnly with no drift, regardless of local timezone", () => {
    // This is the exact bug class that caused the calendar-export off-by-one:
    // new Date("2029-04-14") parses as UTC midnight, which renders as
    // 2029-04-13 in any timezone behind UTC. parseDateOnly must not do that.
    expect(formatDateOnly(parseDateOnly("2029-04-14"))).toBe("2029-04-14");
    expect(formatDateOnly(parseDateOnly("2026-01-01"))).toBe("2026-01-01");
    expect(formatDateOnly(parseDateOnly("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("formatYYYYMMDD", () => {
  it("formats with no separators, for ICS DTSTART", () => {
    expect(formatYYYYMMDD(parseDateOnly("2027-10-30"))).toBe("20271030");
  });
});

describe("seasonForDate", () => {
  it("maps each month to the season given in the spec", () => {
    const cases: [string, string][] = [
      ["2026-01-15", "winter"], ["2026-02-15", "winter"], ["2026-12-15", "winter"],
      ["2026-03-15", "spring"], ["2026-04-15", "spring"], ["2026-05-15", "spring"],
      ["2026-06-15", "summer"], ["2026-07-15", "summer"], ["2026-08-15", "summer"],
      ["2026-09-15", "fall"], ["2026-10-15", "fall"], ["2026-11-15", "fall"],
    ];
    for (const [date, expected] of cases) {
      expect(seasonForDate(date)).toBe(expected);
    }
  });

  it("returns 'any' for a null date", () => {
    expect(seasonForDate(null)).toBe("any");
  });
});
