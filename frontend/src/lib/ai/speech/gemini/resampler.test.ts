import { describe, expect, it } from "vitest";
import { PcmDownsampler } from "./resampler";

describe("PcmDownsampler", () => {
  it("averages 48kHz down to 16kHz", () => {
    const d = new PcmDownsampler(48_000, 16_000);
    const out = d.process(new Float32Array([0, 0.3, 0.6, 1, 1, 1]));
    expect(Array.from(out).map((v) => +v.toFixed(3))).toEqual([0.3, 1]);
  });

  it("keeps the exact count across uneven chunks (44.1kHz)", () => {
    const d = new PcmDownsampler(44_100, 16_000);
    let total = 0;
    // One second of audio in odd-sized chunks
    for (const size of [128, 1000, 4096, 333, 38_543]) {
      total += d.process(new Float32Array(size).fill(0.5)).length;
    }
    expect(Math.abs(total - 16_000)).toBeLessThanOrEqual(1);
  });

  it("keeps a constant signal constant", () => {
    const d = new PcmDownsampler(44_100, 16_000);
    const out = d.process(new Float32Array(4096).fill(0.25));
    expect(out.every((v) => Math.abs(v - 0.25) < 1e-6)).toBe(true);
  });

  it("passes audio through when the device is already at or below 16kHz", () => {
    const d = new PcmDownsampler(16_000, 16_000);
    expect(d.outRate).toBe(16_000);
    expect(d.process(new Float32Array([0.1, 0.2])).length).toBe(2);
    expect(new PcmDownsampler(8_000, 16_000).outRate).toBe(8_000);
  });
});
