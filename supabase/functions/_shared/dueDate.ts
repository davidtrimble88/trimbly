// Keeps an AI-suggested due date for a *recurring* maintenance task anchored
// to the near term. Both maintenance-generation edge functions only tell the
// model to pick "realistic due dates ... going forward 12 months" — nothing
// stops it from returning a date several years out. Once a stray far-future
// date lands in the tasks table, the client's completion flow just keeps
// adding the recurrence interval to it, so the task never gets an occurrence
// in the intervening years. Snapping recurring due dates back into a sane
// window at generation time keeps the cycle on track from the start.
export function normalizeRecurringDueDate(
  dueDate: unknown,
  recurrenceMonths: number,
  from: Date = new Date(),
): string {
  const now = new Date(from);
  now.setHours(0, 0, 0, 0);

  let d = typeof dueDate === "string" ? new Date(`${dueDate}T00:00:00`) : new Date(NaN);
  if (isNaN(d.getTime())) d = new Date(now);

  if (recurrenceMonths > 0) {
    // Window scales with the task's own interval (plus a month of slack) so a
    // 12-month task must land within ~13 months, while a legitimately long
    // cycle (e.g. a 60-month coolant flush) isn't squeezed into a near window
    // it was never meant to fit — only a date that skipped whole cycles ahead
    // gets pulled back.
    const horizon = new Date(now);
    horizon.setMonth(horizon.getMonth() + recurrenceMonths + 1);
    while (d.getTime() < now.getTime()) d.setMonth(d.getMonth() + recurrenceMonths);
    while (d.getTime() > horizon.getTime()) d.setMonth(d.getMonth() - recurrenceMonths);
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}