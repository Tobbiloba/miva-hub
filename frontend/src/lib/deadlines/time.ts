/**
 * Students' clock. Askly's students are in Nigeria (Africa/Lagos, UTC+1, no
 * DST); servers run in UTC, so anything the model or a student reads as "now"
 * or "due at" is formatted here, with the zone stated, never with the
 * server's local time. Override with APP_TIMEZONE for another market.
 */
export const STUDENT_TIMEZONE = process.env.APP_TIMEZONE || "Africa/Lagos";

export function formatStudentTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDENT_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(date);
}

/** UTC offset of the students' zone at `date`, e.g. "+01:00". */
export function studentUtcOffset(date: Date = new Date()): string {
  const part = new Intl.DateTimeFormat("en-US", {
    timeZone: STUDENT_TIMEZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = part?.match(/GMT([+-]\d{2}:\d{2})/);
  return match ? match[1] : "+00:00";
}
