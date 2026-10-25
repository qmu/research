import { describe, expect, it } from "vitest";
import { enrichQuality, sha256 } from "./quality.js";

const inputSha256 = sha256("fixed prompt");
const fixtures = [{ id: "answer-v1", inputSha256, expected: "42" }];
const source = JSON.stringify({
  schemaVersion: 1,
  inputSha256,
  sampling: { seed: 42 },
  runs: ["ollama", "llama.cpp", "mlx", "strata"].map((engine) => ({
    engine,
    model: "synthetic",
    status: "measured",
    metrics: { tps: { value: 0 } },
  })),
});
const evidence = () => ({
  sourceSha256: sha256(source),
  outputs: [0, 1, 2, 3].map((runIndex) => ({
    runIndex,
    fixtureId: "answer-v1",
    text: "42",
  })),
});

describe("fixed-fixture quality integration", () => {
  it("persists all four engines, version and fixture identity, preserving measurements", () => {
    const result = enrichQuality(source, fixtures, evidence());
    expect(result.runs).toHaveLength(4);
    for (const run of result.runs) {
      expect(run.metrics).toEqual({ tps: { value: 0 } });
      expect(run.quality[0]).toEqual({
        fixtureId: "answer-v1",
        fixtureSha256: sha256(JSON.stringify(["answer-v1", inputSha256, "42"])),
        evaluatorVersion: "exact-text/v1",
        verdict: "pass",
        reason: null,
      });
    }
    expect(enrichQuality(source, fixtures, evidence())).toEqual(result);
    expect(JSON.stringify(result)).not.toContain('"text"');
  });
  it.each(["", "42\n", "wrong"])(
    "scores completed nonmatching output %j as fail",
    (text) => {
      const data = evidence();
      data.outputs[0].text = text;
      expect(
        enrichQuality(source, fixtures, data).runs[0].quality[0].verdict,
      ).toBe("fail");
    },
  );
  it("records missing output and input mismatch separately per fixture", () => {
    const result = enrichQuality(
      source,
      [
        ...fixtures,
        { id: "other", inputSha256: sha256("other"), expected: "x" },
      ],
      { sourceSha256: sha256(source), outputs: [] },
    );
    expect(result.runs[0].quality.map((q) => [q.verdict, q.reason])).toEqual([
      ["undetermined", "NO-OUTPUT"],
      ["undetermined", "INPUT-MISMATCH"],
    ]);
  });
  it("never scores a failed measurement even with matching output", () => {
    const failed = source.replaceAll('"measured"', '"failed"');
    expect(
      enrichQuality(failed, fixtures, {
        ...evidence(),
        sourceSha256: sha256(failed),
      }).runs[0].quality[0].reason,
    ).toBe("MEASURE-FAILED");
  });
  it("rejects stale evidence", () => {
    expect(() => enrichQuality(source + "\n", fixtures, evidence())).toThrow(
      "SHA-256",
    );
  });
  it("rejects duplicate fixture and output identities", () => {
    expect(() =>
      enrichQuality(source, [...fixtures, ...fixtures], evidence()),
    ).toThrow("Duplicate fixture");
    const data = evidence();
    data.outputs.push(data.outputs[0]);
    expect(() => enrichQuality(source, fixtures, data)).toThrow(
      "Duplicate output",
    );
  });
  it.each([-1, 4, 0.5])("rejects invalid run index %s", (runIndex) => {
    const data = evidence();
    data.outputs[0].runIndex = runIndex;
    expect(() => enrichQuality(source, fixtures, data)).toThrow(
      "Invalid output",
    );
  });
  it("refuses to overwrite existing judgments", () => {
    const enriched = JSON.stringify(
      enrichQuality(source, fixtures, evidence()),
    );
    expect(() =>
      enrichQuality(enriched, fixtures, {
        sourceSha256: sha256(enriched),
        outputs: [],
      }),
    ).toThrow("already exists");
  });
  it("changes fixture digest when expected text changes", () => {
    expect(
      enrichQuality(source, [{ ...fixtures[0], expected: "43" }], evidence())
        .runs[0].quality[0].fixtureSha256,
    ).not.toBe(
      enrichQuality(source, fixtures, evidence()).runs[0].quality[0]
        .fixtureSha256,
    );
  });
});
