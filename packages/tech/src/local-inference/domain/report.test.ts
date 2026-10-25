import { describe, expect, it } from "vitest";
import fixture from "../fixtures/comparison.json";
import {
  gapReasons,
  parseInferenceReport,
  renderInferenceReport,
} from "./report";

describe("local inference comparison", () => {
  it("is byte stable across input order and preserves zero and gaps", () => {
    const output = renderInferenceReport(fixture);
    expect(
      renderInferenceReport({ ...fixture, runs: [...fixture.runs].reverse() }),
    ).toBe(output);
    expect(output).toContain("| 12.5 | 0 |");
    expect(output).toContain("n/a (NO-FIELD)");
    expect(output).toContain("Fixture only");
    expect(fixture.runs.map((row) => row.backend)).toEqual([
      "Ollama",
      "llama.cpp server",
      "MLX",
      "Strata",
    ]);
  });
  it.each(gapReasons)("preserves reason %s", (reason) => {
    const runs = [{ ...fixture.runs[0], speed: { value: null, reason } }];
    expect(renderInferenceReport({ ...fixture, runs })).toContain(
      `n/a (${reason})`,
    );
  });
  it.each([
    null,
    { value: null },
    { value: null, reason: "unknown" },
    { value: -1 },
    { value: Infinity },
    { value: "1" },
    { value: 1, reason: "NOT-RUN" },
  ])("rejects ambiguous or invalid speed %j", (speed) => {
    expect(() =>
      parseInferenceReport({
        ...fixture,
        runs: [{ ...fixture.runs[0], speed }],
      }),
    ).toThrow();
  });
  it("rejects invalid schema, identity and quality", () => {
    for (const input of [
      null,
      { ...fixture, schemaVersion: 2 },
      { ...fixture, fixture: undefined },
      { ...fixture, runs: [fixture.runs[0], fixture.runs[0]] },
      { ...fixture, runs: [{ ...fixture.runs[0], hardware: "" }] },
      { ...fixture, runs: [{ ...fixture.runs[0], quality: { value: 1.1 } }] },
    ]) {
      expect(() => parseInferenceReport(input)).toThrow();
    }
  });
  it("escapes table structure and HTML and leaves the input unchanged", () => {
    const input = {
      ...fixture,
      fixture: false,
      runs: [{ ...fixture.runs[0], model: "<script>|[link]\nnext" }],
    };
    const before = JSON.stringify(input);
    const output = renderInferenceReport(input);
    expect(output).toContain("&#60;script&#62;&#124;&#91;link&#93; next");
    expect(output).toContain("Imported measurements");
    expect(JSON.stringify(input)).toBe(before);
  });
});
