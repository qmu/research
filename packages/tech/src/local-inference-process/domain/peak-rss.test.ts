import { describe, expect, it } from "vitest";
import { parseDarwinPeakRss } from "./peak-rss.js";

describe("Darwin time maximum RSS", () => {
  it("converts bytes to MiB, preserving fractional MiB", () => {
    expect(
      parseDarwinPeakRss("  1572864  maximum resident set size\n"),
    ).toEqual({ value: 1.5, unit: "MiB" });
  });
  it("keeps missing fields unknown", () => {
    expect(parseDarwinPeakRss("0.01 real 0.00 user\n")).toEqual({
      value: null,
      unit: "MiB",
      reason: "NO-FIELD",
    });
  });
  it.each(["0", "-1", "NaN", "Infinity", "1.5", "9007199254740992"])(
    "rejects invalid byte reading %s",
    (value) => {
      expect(parseDarwinPeakRss(`${value} maximum resident set size`)).toEqual({
        value: null,
        unit: "MiB",
        reason: "MEASURE-FAILED",
      });
    },
  );
  it("rejects ambiguous duplicate fields", () => {
    expect(
      parseDarwinPeakRss(
        "1048576 maximum resident set size\n2097152 maximum resident set size",
      ).value,
    ).toBeNull();
  });
});
