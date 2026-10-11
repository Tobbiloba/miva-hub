import { describe, expect, it } from "vitest";
import {
  attendanceByMonth,
  daysOfWeek,
  isLogDay,
  monthLabel,
  monthOfWeek,
  parseDay,
  placementWeeks,
  weekEndingOf,
} from "./calendar";

describe("SIWES calendar", () => {
  it("only accepts real days", () => {
    expect(parseDay("2025-03-03")).not.toBeNull();
    expect(parseDay("2025-02-30")).toBeNull();
    expect(parseDay("3/3/2025")).toBeNull();
  });

  it("puts Monday to Saturday in the week ending on the Saturday", () => {
    // 3 March 2025 was a Monday
    expect(weekEndingOf("2025-03-03")).toBe("2025-03-08");
    expect(weekEndingOf("2025-03-08")).toBe("2025-03-08");
    expect(weekEndingOf("2025-03-09")).toBeNull(); // Sunday has no row
    expect(isLogDay("2025-03-09")).toBe(false);
    expect(daysOfWeek("2025-03-08")).toEqual([
      "2025-03-03",
      "2025-03-04",
      "2025-03-05",
      "2025-03-06",
      "2025-03-07",
      "2025-03-08",
    ]);
  });

  it("lists the weeks of a three-month placement", () => {
    const weeks = placementWeeks("2025-03-03", "2025-05-31");
    expect(weeks[0]).toBe("2025-03-08");
    expect(weeks.at(-1)).toBe("2025-05-31");
    expect(weeks).toHaveLength(13);
    // a Sunday start begins with the following week
    expect(placementWeeks("2025-03-02", "2025-03-15")).toEqual([
      "2025-03-08",
      "2025-03-15",
    ]);
    expect(placementWeeks("2025-05-01", "2025-03-01")).toEqual([]);
  });

  it("files a week under the month of its week ending", () => {
    // Mon 31 March – Sat 5 April belongs to April
    expect(monthOfWeek(weekEndingOf("2025-03-31")!)).toBe("2025-04");
    expect(monthLabel("2025-04")).toBe("April 2025");
  });

  it("builds the attendance register by month", () => {
    expect(
      attendanceByMonth([
        { entryDate: "2025-03-03", present: true },
        { entryDate: "2025-03-04", present: false, absenceReason: "Sick" },
        { entryDate: "2025-03-05", present: false, absenceReason: "Sick" },
        { entryDate: "2025-04-01", present: true },
        { entryDate: "2025-03-09", present: true }, // Sunday: ignored
      ]),
    ).toEqual([
      { month: "2025-03", present: 1, absent: 2, reasons: ["Sick"] },
      { month: "2025-04", present: 1, absent: 0, reasons: [] },
    ]);
  });
});
