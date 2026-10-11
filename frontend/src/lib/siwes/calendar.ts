/**
 * Calendar rules of MIVA's SIWES log book. Pure (no DB) so the page, the
 * chat tool and the PDF export agree.
 *
 * The book is laid out in weeks of Monday to Saturday, each headed by its
 * "week ending" date (the Saturday). Months group the weeks (monthly
 * summary, attendance register). Dates are plain "YYYY-MM-DD" days in the
 * student's own calendar, so no time zone can move them.
 */

const DAY_MS = 86_400_000;

export const LOG_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse "YYYY-MM-DD" to a UTC-midnight Date, or null if it isn't a real day */
export function parseDay(day: string): Date | null {
  const m = DATE_RE.exec(day);
  if (!m) return null;
  const date = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return date.toISOString().slice(0, 10) === day ? date : null;
}

export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, n: number): string {
  const date = parseDay(day);
  if (!date) throw new Error(`Invalid day: ${day}`);
  return formatDay(new Date(date.getTime() + n * DAY_MS));
}

/** Monday = 0 … Saturday = 5; Sunday = 6 */
function weekdayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

/** Whether the day is one the book has a row for (Monday to Saturday) */
export function isLogDay(day: string): boolean {
  const date = parseDay(day);
  return !!date && weekdayIndex(date) <= 5;
}

/** The book's "week ending" (Saturday) for a Monday–Saturday day; null for Sunday */
export function weekEndingOf(day: string): string | null {
  const date = parseDay(day);
  if (!date) return null;
  const index = weekdayIndex(date);
  if (index === 6) return null;
  return addDays(day, 5 - index);
}

/** The six days (Monday to Saturday) of the week ending on `weekEnding` */
export function daysOfWeek(weekEnding: string): string[] {
  return LOG_DAYS.map((_, i) => addDays(weekEnding, i - 5));
}

/** Week endings covering a placement, first to last */
export function placementWeeks(startDay: string, endDay: string): string[] {
  const start = parseDay(startDay);
  const end = parseDay(endDay);
  if (!start || !end || end < start) return [];
  // A placement starting on a Sunday begins with the next week
  const first =
    weekEndingOf(startDay) ?? weekEndingOf(addDays(startDay, 1)) ?? startDay;
  const last = weekEndingOf(endDay) ?? addDays(endDay, -1);
  const weeks: string[] = [];
  for (let w = first; w <= last && weeks.length < 60; w = addDays(w, 7)) {
    weeks.push(w);
  }
  return weeks;
}

/** "YYYY-MM": the month a week belongs to in the book (by its week ending) */
export function monthOfWeek(weekEnding: string): string {
  return weekEnding.slice(0, 7);
}

/** "March 2025" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Monday 3 March" */
export function dayLabel(day: string): string {
  const date = parseDay(day);
  if (!date) return day;
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

export type AttendanceDay = {
  entryDate: string;
  present: boolean;
  absenceReason?: string | null;
};

/**
 * The attendance register: per month, the working days logged present and
 * absent, with the reasons given. Only logged days count; the student
 * logs an absence like any other day.
 */
export function attendanceByMonth(
  days: AttendanceDay[],
): { month: string; present: number; absent: number; reasons: string[] }[] {
  const byMonth = new Map<
    string,
    { present: number; absent: number; reasons: string[] }
  >();
  for (const d of [...days].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate),
  )) {
    if (!isLogDay(d.entryDate)) continue;
    const month = d.entryDate.slice(0, 7);
    const row = byMonth.get(month) ?? { present: 0, absent: 0, reasons: [] };
    if (d.present) row.present += 1;
    else {
      row.absent += 1;
      const reason = d.absenceReason?.trim();
      if (reason && !row.reasons.includes(reason)) row.reasons.push(reason);
    }
    byMonth.set(month, row);
  }
  return [...byMonth.entries()].map(([month, row]) => ({ month, ...row }));
}
