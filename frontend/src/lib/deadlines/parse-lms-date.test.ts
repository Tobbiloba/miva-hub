import { describe, expect, it } from "vitest";
import { parseLmsDate } from "./parse-lms-date";

describe("parseLmsDate", () => {
  it("takes ISO datetimes as-is", () => {
    expect(parseLmsDate("2025-10-10T23:59:00+01:00")?.toISOString()).toBe(
      "2025-10-10T22:59:00.000Z",
    );
  });

  it("reads Moodle's rendered date as Lagos wall-clock time", () => {
    expect(
      parseLmsDate("Friday, 10 October 2025, 11:59 PM")?.toISOString(),
    ).toBe("2025-10-10T22:59:00.000Z");
  });

  it("keeps the due part when the page lists several dates", () => {
    expect(
      parseLmsDate(
        "Opened: Monday, 1 September 2025, 12:00 AM Due: Friday, 10 October 2025, 5:00 PM",
      )?.toISOString(),
    ).toBe("2025-10-10T16:00:00.000Z");
  });

  it("handles month-first dates and 12 AM/PM", () => {
    expect(
      parseLmsDate("Closes: October 10, 2025, 12:30 AM")?.toISOString(),
    ).toBe("2025-10-09T23:30:00.000Z");
    expect(parseLmsDate("10 Oct 2025, 12:00 PM")?.toISOString()).toBe(
      "2025-10-10T11:00:00.000Z",
    );
  });

  it("uses end of day when no time is shown", () => {
    expect(parseLmsDate("Due date: 10 October 2025")?.toISOString()).toBe(
      "2025-10-10T22:59:00.000Z",
    );
  });

  it("returns null for anything that isn't a real date", () => {
    expect(parseLmsDate(undefined)).toBeNull();
    expect(parseLmsDate("")).toBeNull();
    expect(parseLmsDate("No due date")).toBeNull();
    expect(parseLmsDate("31 February 2025")).toBeNull();
    expect(parseLmsDate("10 Smarch 2025")).toBeNull();
  });
});
