import { describe, expect, it } from "vitest";
import {
  characterErrorRate,
  editDistance,
  scoreStructuredFields,
  summarizeStats,
  wordErrorRate,
} from "./ocr";
import type { FieldSpec } from "./types";

const schema = [
  { name: "document_id", type: "string", normalization: "uppercase-trim" },
  { name: "total", type: "string", normalization: "decimal-string" },
  { name: "currency", type: "string", normalization: "uppercase-trim" },
] satisfies ReadonlyArray<FieldSpec>;

describe("edit distance", () => {
  it("matches classic character-edit examples", () => {
    expect(editDistance(Array.from("kitten"), Array.from("sitting"))).toBe(3);
    expect(editDistance(Array.from("flaw"), Array.from("lawn"))).toBe(2);
  });
});

describe("OCR transcription rates", () => {
  it("computes character error rate from normalized character distance", () => {
    expect(characterErrorRate("kitten", "sitting")).toBe(0.5);
    expect(characterErrorRate("ABC  123", "ABC 123")).toBe(0);
  });

  it("computes word error rate from token edit distance", () => {
    expect(wordErrorRate("the quick brown fox", "the quick fox")).toBe(0.25);
    expect(wordErrorRate("hello world", "hello brave world")).toBe(0.5);
  });

  it("handles empty references deterministically", () => {
    expect(characterErrorRate("", "")).toBe(0);
    expect(characterErrorRate("", "extra")).toBe(1);
    expect(wordErrorRate("", "")).toBe(0);
    expect(wordErrorRate("", "extra")).toBe(1);
  });
});

describe("structured field score", () => {
  it("scores exact normalized required fields", () => {
    const result = scoreStructuredFields(
      { document_id: "R-2026-0708", total: "30.13", currency: "USD" },
      { document_id: "r-2026-0708", total: "30.130", currency: "usd" },
      schema,
    );

    expect(result.accuracy).toBe(1);
    expect(result.correct).toBe(3);
    expect(result.total).toBe(3);
  });

  it("counts missing and incorrect fields at field level", () => {
    const result = scoreStructuredFields(
      { document_id: "R-2026-0708", total: "30.13", currency: "USD" },
      { document_id: "R-2026-0708", total: "31.00" },
      schema,
    );

    expect(result.accuracy).toBe(1 / 3);
    expect(result.fields.map((field) => field.correct)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("metric statistics", () => {
  it("returns mean, sample standard deviation, and n", () => {
    expect(summarizeStats([1, 2, 3])).toEqual({
      mean: 2,
      stdDev: 1,
      n: 3,
    });
  });
});
