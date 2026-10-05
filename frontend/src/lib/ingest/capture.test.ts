import { describe, expect, it } from "vitest";
import {
  LessonCaptureSchema,
  escapeLike,
  isAllowedPdfUrl,
  isOwnCaptureUploadKey,
  newCaptureUploadKey,
  isShareableCapture,
  sanitizePdfFilename,
} from "./capture";

const hosts = ["lms-assets.miva.university"];

describe("isAllowedPdfUrl", () => {
  it("accepts https URLs on an allowed host", () => {
    expect(
      isAllowedPdfUrl("https://lms-assets.miva.university/a/b.pdf", hosts),
    ).toBe(true);
  });

  it.each([
    ["http downgrade", "http://lms-assets.miva.university/a.pdf"],
    ["other host", "https://evil.example.com/a.pdf"],
    ["lookalike suffix", "https://lms-assets.miva.university.evil.com/a.pdf"],
    ["internal metadata IP", "https://169.254.169.254/latest/meta-data"],
    ["localhost", "https://localhost/a.pdf"],
    ["credentials in URL", "https://u:p@lms-assets.miva.university/a.pdf"],
    ["non-default port", "https://lms-assets.miva.university:8443/a.pdf"],
    ["not a URL", "lms-assets.miva.university/a.pdf"],
  ])("rejects %s", (_label, url) => {
    expect(isAllowedPdfUrl(url, hosts)).toBe(false);
  });
});

describe("sanitizePdfFilename", () => {
  it("strips path traversal and unsafe characters", () => {
    expect(sanitizePdfFilename("../../etc/passwd", "lesson")).toBe(
      "passwd.pdf",
    );
    expect(sanitizePdfFilename("..\\..\\x y.PDF", "lesson")).toBe("x-y.pdf");
  });

  it("falls back to the slug when nothing usable remains", () => {
    expect(sanitizePdfFilename("../", "week-1")).toBe("week-1.pdf");
    expect(sanitizePdfFilename(null, "week-1")).toBe("week-1.pdf");
  });
});

describe("isShareableCapture", () => {
  it("never shares assignment pages (personal submission status)", () => {
    expect(
      isShareableCapture(
        "assignment_external",
        "https://lms.miva.university/mod/assign/view.php?id=1",
      ),
    ).toBe(false);
  });

  it("shares quiz intro pages but not attempts/reviews (student answers)", () => {
    expect(
      isShareableCapture(
        "quiz",
        "https://lms.miva.university/mod/quiz/view.php?id=1",
      ),
    ).toBe(true);
    expect(
      isShareableCapture(
        "quiz",
        "https://lms.miva.university/mod/quiz/review.php?attempt=9",
      ),
    ).toBe(false);
    expect(
      isShareableCapture(
        "quiz",
        "https://lms.miva.university/mod/quiz/attempt.php?attempt=9",
      ),
    ).toBe(false);
  });

  it("shares lesson videos and PDFs", () => {
    expect(isShareableCapture("video", "https://lms.miva.university/x")).toBe(
      true,
    );
    expect(isShareableCapture("pdf", "https://lms.miva.university/x")).toBe(
      true,
    );
  });
});

describe("escapeLike", () => {
  it("escapes LIKE wildcards", () => {
    expect(escapeLike("50%_off\\")).toBe("50\\%\\_off\\\\");
  });
});

describe("LessonCaptureSchema", () => {
  const base = {
    source_url: "https://lms.miva.university/mod/resource/view.php?id=1",
    course_code: "COS201",
    lesson_title: "Week 1 notes",
  };

  it("rejects PDFs hosted off the LMS", () => {
    const result = LessonCaptureSchema.safeParse({
      ...base,
      content_type: "pdf",
      pdf_url: "https://evil.example.com/a.pdf",
    });
    expect(result.success).toBe(false);
  });

  it("requires a numeric Vimeo id for videos", () => {
    expect(
      LessonCaptureSchema.safeParse({ ...base, content_type: "video" }).success,
    ).toBe(false);
    expect(
      LessonCaptureSchema.safeParse({
        ...base,
        content_type: "video",
        vimeo_video_id: "12345",
      }).success,
    ).toBe(true);
  });

  it("caps oversized quiz payloads", () => {
    const result = LessonCaptureSchema.safeParse({
      ...base,
      content_type: "quiz",
      quiz_questions: Array.from({ length: 201 }, () => ({ text: "q" })),
    });
    expect(result.success).toBe(false);
  });
});

describe("capture upload keys", () => {
  const me = "24ab77e5-2536-4a48-865e-5f4c1aeb6717";
  const other = "11111111-2222-4333-8444-555555555555";

  it("issues keys bound to the user with a sanitized filename", () => {
    const key = newCaptureUploadKey(me, "../Week 1 Notes.PDF");
    expect(key.startsWith(`uploads/capture/${me}/`)).toBe(true);
    expect(key.endsWith("/Week-1-Notes.pdf")).toBe(true);
    expect(isOwnCaptureUploadKey(key, me)).toBe(true);
  });

  it("rejects another user's key and arbitrary bucket paths", () => {
    const key = newCaptureUploadKey(other, "notes.pdf");
    expect(isOwnCaptureUploadKey(key, me)).toBe(false);
    expect(isOwnCaptureUploadKey("materials/private/x/secret.pdf", me)).toBe(
      false,
    );
    expect(
      isOwnCaptureUploadKey(`uploads/capture/${me}/../../materials/a.pdf`, me),
    ).toBe(false);
  });

  it("allows a PDF capture with an upload_key and no pdf_url", () => {
    expect(
      LessonCaptureSchema.safeParse({
        source_url: "https://lms.miva.university/mod/resource/view.php?id=1",
        course_code: "COS101",
        lesson_title: "Notes",
        content_type: "pdf",
        upload_key: newCaptureUploadKey(me, "notes.pdf"),
      }).success,
    ).toBe(true);
  });
});
