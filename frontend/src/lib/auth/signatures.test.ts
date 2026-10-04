import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { safeEqual, verifyMetaSignature } from "./signatures";

const sign = (body: string, secret: string) =>
  `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("s3cret", "s3cret")).toBe(true);
  });
  it("rejects different strings and lengths", () => {
    expect(safeEqual("s3cret", "s3cres")).toBe(false);
    expect(safeEqual("s3", "s3cret")).toBe(false);
  });
  it("fails closed on missing values", () => {
    expect(safeEqual("", "")).toBe(false);
    expect(safeEqual(null, "x")).toBe(false);
    expect(safeEqual("x", undefined)).toBe(false);
  });
});

describe("verifyMetaSignature", () => {
  const body = JSON.stringify({ entry: [{ id: "1" }] });
  const secret = "app-secret";

  it("accepts a valid signature", () => {
    expect(verifyMetaSignature(body, sign(body, secret), secret)).toBe(true);
  });
  it("accepts uppercase hex", () => {
    const hex = sign(body, secret).slice("sha256=".length);
    expect(
      verifyMetaSignature(body, `sha256=${hex.toUpperCase()}`, secret),
    ).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyMetaSignature(`${body} `, sign(body, secret), secret)).toBe(
      false,
    );
  });
  it("rejects the wrong secret", () => {
    expect(verifyMetaSignature(body, sign(body, "other"), secret)).toBe(false);
  });
  it("rejects malformed or missing headers", () => {
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature(body, "sha1=abc", secret)).toBe(false);
    expect(verifyMetaSignature(body, "sha256=zz", secret)).toBe(false);
  });
  it("fails closed without a secret", () => {
    expect(verifyMetaSignature(body, sign(body, ""), "")).toBe(false);
  });
});
