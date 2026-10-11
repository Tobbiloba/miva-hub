import { describe, expect, it } from "vitest";
import {
  levelFromCode,
  lmsCourseTitle,
  normaliseLmsCourseCode,
} from "./course-codes";

describe("normaliseLmsCourseCode", () => {
  it("handles the shapes MIVA's LMS uses", () => {
    expect(normaliseLmsCourseCode("COS 409")).toBe("COS409");
    expect(normaliseLmsCourseCode("MIVA-CSC 303")).toBe("CSC303");
    expect(normaliseLmsCourseCode("CSC 301 301")).toBe("CSC301");
    expect(normaliseLmsCourseCode("IFT 299 ")).toBe("IFT299");
    expect(normaliseLmsCourseCode("MIVA-ECO 106")).toBe("ECO106");
    expect(normaliseLmsCourseCode("cos409")).toBe("COS409");
  });

  it("falls back to the full name, and gives up without a code", () => {
    expect(
      normaliseLmsCourseCode("ORI 100x", "ORI 100 - General Orientation"),
    ).toBe("ORI100");
    expect(normaliseLmsCourseCode("Writing", "Writing Course")).toBeNull();
  });
});

describe("lmsCourseTitle", () => {
  it("strips the code prefix and decodes entities", () => {
    expect(
      lmsCourseTitle(
        "COS 409-Research Methodology and Technical Report Writing",
        "COS409",
      ),
    ).toBe("Research Methodology and Technical Report Writing");
    expect(
      lmsCourseTitle(
        "ICT 305 - Data Communication System &amp; Network",
        "ICT305",
      ),
    ).toBe("Data Communication System & Network");
    expect(
      lmsCourseTitle(
        "MiVA-CSC 405-Organisation of Programming Languages",
        "CSC405",
      ),
    ).toBe("Organisation of Programming Languages");
    expect(lmsCourseTitle("CSC 301 301 - Data Structures", "CSC301")).toBe(
      "Data Structures",
    );
  });
});

describe("levelFromCode", () => {
  it("reads the level from the first digit", () => {
    expect(levelFromCode("COS409")).toBe("400L");
    expect(levelFromCode("GST111")).toBe("100L");
    expect(levelFromCode("DTS204")).toBe("200L");
    expect(levelFromCode("CSC306")).toBe("300L");
  });
});
