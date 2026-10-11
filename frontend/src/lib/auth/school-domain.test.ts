import { describe, expect, it } from "vitest";
import { isSchoolDomain } from "./school-domain";

describe("isSchoolDomain", () => {
  it("accepts school domains", () => {
    for (const d of [
      "unilag.edu.ng",
      "student.ui.edu.ng",
      "miva.edu.ng",
      "ox.ac.uk",
      "uct.ac.za",
      "mit.edu",
      "cs.stanford.edu",
      "kings.sch.ng",
      "UNILAG.EDU.NG",
    ]) {
      expect(isSchoolDomain(d), d).toBe(true);
    }
  });

  it("refuses personal and business domains", () => {
    for (const d of [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "company.com",
      "edu.ng",
      "ac.uk",
      "school.com",
      "fake-edu.com",
      "edu.example.com",
    ]) {
      expect(isSchoolDomain(d), d).toBe(false);
    }
  });

  it("refuses malformed input", () => {
    for (const d of [
      "",
      null,
      undefined,
      "localhost",
      "a..edu.ng",
      "x@y.edu",
    ]) {
      expect(isSchoolDomain(d as string), String(d)).toBe(false);
    }
  });
});
