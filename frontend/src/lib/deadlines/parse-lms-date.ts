/**
 * Parse the due date the Capture extension scraped from an LMS assignment or
 * quiz page into an absolute time.
 *
 * Moodle gives either an ISO datetime (the <time datetime> attribute) or the
 * rendered text, e.g. "Due: Friday, 10 October 2025, 11:59 PM". Rendered times
 * are wall-clock in the LMS's timezone; MIVA is Africa/Lagos (UTC+1, no DST).
 * Text that also lists other dates ("Opened: … Due: …") is narrowed to the
 * due/close part first. Returns null when nothing date-like is found: a
 * missing deadline is better than a wrong one.
 */

const LMS_UTC_OFFSET_MINUTES = 60;

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
// "10 October 2025, 11:59 PM" (Moodle) — time optional
const DAY_MONTH_YEAR =
  /(\d{1,2})\s+([A-Za-z]{3,})\.?,?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?)?/;
// "October 10, 2025, 11:59 PM" — time optional
const MONTH_DAY_YEAR =
  /([A-Za-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})\s*([AaPp][Mm])?)?/;

export function parseLmsDate(raw: unknown): Date | null {
  if (typeof raw !== "string") return null;
  let text = raw.trim();
  if (!text) return null;

  if (ISO_RE.test(text)) {
    const d = new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // Keep only the due/close part when several labelled dates are present
  const labelled = text.match(
    /(?:due|closes?|deadline)\s*(?:date)?\s*:?\s*(.+)/i,
  );
  if (labelled) text = labelled[1];

  let day: number, month: number | undefined, year: number;
  let hour: string | undefined,
    minute: string | undefined,
    ampm: string | undefined;
  const dmy = text.match(DAY_MONTH_YEAR);
  const mdy = dmy ? null : text.match(MONTH_DAY_YEAR);
  if (dmy) {
    day = Number(dmy[1]);
    month = MONTHS[dmy[2].slice(0, 3).toLowerCase()];
    year = Number(dmy[3]);
    [hour, minute, ampm] = [dmy[4], dmy[5], dmy[6]];
  } else if (mdy) {
    month = MONTHS[mdy[1].slice(0, 3).toLowerCase()];
    day = Number(mdy[2]);
    year = Number(mdy[3]);
    [hour, minute, ampm] = [mdy[4], mdy[5], mdy[6]];
  } else {
    return null;
  }
  if (month === undefined || day < 1 || day > 31) return null;

  // No time on the page: the deadline is the end of that day
  let h = hour === undefined ? 23 : Number(hour);
  const m = minute === undefined ? 59 : Number(minute);
  if (ampm) {
    const pm = ampm.toLowerCase() === "pm";
    if (h === 12) h = pm ? 12 : 0;
    else if (pm) h += 12;
  }
  if (h > 23 || m > 59) return null;

  const utc =
    Date.UTC(year, month, day, h, m) - LMS_UTC_OFFSET_MINUTES * 60_000;
  const d = new Date(utc);
  // Reject roll-overs like "31 February"
  const local = new Date(utc + LMS_UTC_OFFSET_MINUTES * 60_000);
  if (local.getUTCDate() !== day || local.getUTCMonth() !== month) return null;
  return d;
}
