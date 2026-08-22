// `new Date("YYYY-MM-DD")` parses as UTC midnight per spec, which silently
// rolls back a calendar day once rendered/exported in any timezone behind
// UTC (this is what caused the calendar-export off-by-one bug). Use
// parseDateOnly instead of `new Date(dueDateString)` anywhere a due_date
// needs to become a Date object, so what's derived from it lines up with
// the date actually stored, with no timezone-dependent drift.
export const parseDateOnly = (dateStr: string): Date => new Date(`${dateStr}T00:00:00`);

export const formatYYYYMMDD = (d: Date): string =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

export const formatDateOnly = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Northern-hemisphere season for a given due date — the season badge should
// always describe when the task is actually due, not a value copied forward
// from a prior cycle (a quarterly-recurring task rotates through all four
// seasons, so a stale copied value drifts wrong after the first renewal).
export const seasonForDate = (dateStr: string | null): string => {
  if (!dateStr) return "any";
  const month = parseDateOnly(dateStr).getMonth(); // 0-indexed, Jan=0
  if (month <= 1 || month === 11) return "winter"; // Dec, Jan, Feb
  if (month <= 4) return "spring"; // Mar, Apr, May
  if (month <= 7) return "summer"; // Jun, Jul, Aug
  return "fall"; // Sep, Oct, Nov
};
