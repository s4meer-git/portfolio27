/**
 * Formats an employment or study period the way chanhdai.com does: "2y 7m", "9m",
 * "3y". Dates are "MM.YYYY" or "YYYY"; an absent end means the role is ongoing.
 *
 * Ported from ncdai/chanhdai.com (MIT), with the date-fns calls replaced by plain
 * arithmetic so the site does not need the dependency.
 */

/** Months since epoch, so two periods can be subtracted directly. */
function toMonths(value: string, edge: "first" | "last"): number | null {
  const match = value.trim().match(/^(?:(\d{1,2})\.)?(\d{4})$/);
  if (!match) return null;
  const [, month, year] = match;
  const monthIndex = month ? Number(month) - 1 : edge === "last" ? 11 : 0;
  return Number(year) * 12 + monthIndex;
}

export function formatDuration(start: string, end?: string | null): string {
  const startMonths = toMonths(start, "first");
  if (startMonths === null) return "";

  const now = new Date();
  const endMonths = end
    ? toMonths(end, "last")
    : now.getFullYear() * 12 + now.getMonth();
  if (endMonths === null) return "";

  // Both ends year-only: report whole years rather than inventing months.
  if (end && !start.includes(".") && !end.includes(".")) {
    const years = Number(end) - Number(start);
    return years > 0 ? `${years}y` : "";
  }

  // +1 so both the first and last month are counted.
  const total = endMonths - startMonths + 1;
  if (total <= 0) return "";
  if (total < 12) return `${total}m`;

  const years = Math.floor(total / 12);
  const months = total % 12;
  return months === 0 ? `${years}y` : `${years}y ${months}m`;
}
