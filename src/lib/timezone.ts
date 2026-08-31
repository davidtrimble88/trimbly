// User timezone helpers. Each profile stores an IANA timezone name
// (e.g. "America/Los_Angeles") captured from the browser at signup/login.

export const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Format a date/timestamp in the user's stored timezone, falling back to the
// browser's timezone when none is stored.
export const formatInTimezone = (
  date: Date | string | number,
  timezone: string | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string => {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
    timeZone: timezone || getBrowserTimezone(),
  };
  try {
    return d.toLocaleDateString(undefined, opts);
  } catch {
    return d.toLocaleDateString(undefined, { ...options, month: "short", day: "numeric", year: "numeric" });
  }
};

export const formatDateTimeInTimezone = (
  date: Date | string | number,
  timezone: string | null | undefined,
): string =>
  formatInTimezone(date, timezone, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
