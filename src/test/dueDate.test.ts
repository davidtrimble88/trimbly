import { describe, it, expect } from "vitest";
// Deliberately reaching outside src/ — this is the actual shared module the
// edge functions import, not a duplicate. It's plain TS with no Deno-only
// globals at module scope, so it imports fine under vitest.
import { normalizeRecurringDueDate } from "../../supabase/functions/_shared/dueDate";

describe("normalizeRecurringDueDate", () => {
  // T00:00:00 (not a bare "YYYY-MM-DD") so this parses as local midnight —
  // a bare date string parses as UTC midnight, which renders as the
  // previous calendar day in any timezone behind UTC. Exactly the bug
  // class this function itself exists to guard against.
  const from = new Date("2026-06-01T00:00:00");

  it("leaves a near-term date for a recurring task untouched", () => {
    expect(normalizeRecurringDueDate("2026-08-15", 12, from)).toBe("2026-08-15");
  });

  it("pulls a stray far-future date back within the task's own horizon (regression: 2029 dates)", () => {
    // This is the actual bug: the AI generator would occasionally return a
    // due date years out for a task that's supposed to recur every 12
    // months, and the completion flow just kept adding 12 months to that
    // far-future anchor forever, so it never got a near-term occurrence.
    const result = normalizeRecurringDueDate("2029-04-14", 12, from);
    const resultDate = new Date(result);
    const horizon = new Date(from);
    horizon.setMonth(horizon.getMonth() + 13);
    expect(resultDate.getTime()).toBeLessThanOrEqual(horizon.getTime());
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it("pulls a stray past date forward into the near term", () => {
    const result = normalizeRecurringDueDate("2020-01-01", 6, from);
    expect(new Date(result).getTime()).toBeGreaterThanOrEqual(from.getTime());
  });

  it("doesn't squeeze a legitimately long cycle into a near window", () => {
    // A 60-month coolant flush due in 3 years is correct, not a bug —
    // only a date that skipped whole cycles ahead should get pulled back.
    const result = normalizeRecurringDueDate("2029-06-01", 60, from);
    expect(result).toBe("2029-06-01");
  });

  it("leaves a one-time task (recurrence 0) alone entirely", () => {
    expect(normalizeRecurringDueDate("2031-01-01", 0, from)).toBe("2031-01-01");
  });

  it("falls back to today for an unparseable date", () => {
    expect(normalizeRecurringDueDate("not-a-date", 12, from)).toBe("2026-06-01");
  });
});
