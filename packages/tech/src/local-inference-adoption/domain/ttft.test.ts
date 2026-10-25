import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { adoptSavedTtft, type TtftIdentity } from "./ttft.js";
import { renderAdoptionReport } from "./adoption.js";

const expected: TtftIdentity = {
  runId: "synthetic-run-1",
  runnerVersion: "local-inference/4",
  targetCommit: "1".repeat(40),
};
const run = (value: unknown = 0.25) => ({
  runId: expected.runId,
  status: "measured",
  metrics: { ttft: { value, unit: "s", source: "client" } },
});
const fixture = () =>
  JSON.parse(
    readFileSync(new URL("../fixtures/baseline.json", import.meta.url), "utf8"),
  );

describe("saved TTFT adoption", () => {
  it.each([0, 0.25, 2.689731])(
    "adopts matching measured seconds, including %s",
    (value) => {
      expect(adoptSavedTtft(expected, run(value), expected)).toEqual({
        value,
        unit: "s",
        reasons: [],
      });
    },
  );
  it.each([
    ["runId", "another-run", "RUN-ID-MISMATCH"],
    ["runnerVersion", "local-inference/3", "RUNNER-VERSION-MISMATCH"],
    ["targetCommit", "2".repeat(40), "COMMIT-MISMATCH"],
  ])(
    "rejects a different %s even if the other dimensions match",
    (key, value, reason) => {
      expect(
        adoptSavedTtft(
          { ...expected, [key]: value },
          key === "runId" ? { ...run(), runId: value } : run(),
          expected,
        ),
      ).toEqual({ value: null, unit: "s", reasons: [reason] });
    },
  );
  it.each(["runId", "runnerVersion", "targetCommit"])(
    "rejects missing/blank/malformed %s",
    (key) => {
      for (const value of [undefined, null, "", "  ", 42]) {
        const result = adoptSavedTtft(
          { ...expected, [key]: value },
          key === "runId" ? { ...run(), runId: value } : run(),
          expected,
        );
        expect(result.value).toBeNull();
        expect(result.reasons[0]).toMatch(/^MISSING-/);
      }
    },
  );
  it("keeps all provenance reasons in fixed order before inspecting metrics", () => {
    expect(
      adoptSavedTtft({}, { ...run(NaN), runId: undefined }, expected).reasons,
    ).toEqual(["MISSING-RUN-ID", "MISSING-RUNNER-VERSION", "MISSING-COMMIT"]);
  });
  it("requires independently supplied identity and refuses unsupported selection", () => {
    expect(adoptSavedTtft(expected, run()).reasons).toEqual([
      "TTFT-IDENTITY-NOT-SELECTED",
    ]);
    for (const invalid of [
      { runId: " " },
      { runnerVersion: "unknown" },
      { targetCommit: "HEAD" },
    ]) {
      expect(() =>
        adoptSavedTtft(expected, run(), { ...expected, ...invalid }),
      ).toThrow("INVALID-TTFT-IDENTITY");
    }
  });
  it.each([NaN, Infinity, -1, "0.25", undefined])(
    "rejects invalid TTFT %s",
    (value) => {
      const input = run();
      input.metrics.ttft.value = value;
      expect(adoptSavedTtft(expected, input, expected).reasons).toEqual([
        "INVALID-TTFT",
      ]);
    },
  );
  it.each(["NO-FIELD", "NOT-RUN", "MEASURE-FAILED"])(
    "preserves %s without manufacturing zero",
    (reason) => {
      expect(
        adoptSavedTtft(
          expected,
          {
            runId: expected.runId,
            status: "measured",
            metrics: { ttft: { value: null, unit: "s", reason } },
          },
          expected,
        ),
      ).toEqual({ value: null, unit: "s", reasons: [reason] });
    },
  );
  it("rejects absent, failed, wrong-unit, wrong-source and contradictory measurements", () => {
    expect(
      adoptSavedTtft(
        expected,
        { runId: expected.runId, status: "measured", metrics: {} },
        expected,
      ).reasons,
    ).toEqual(["NO-FIELD"]);
    expect(
      adoptSavedTtft(expected, { ...run(), status: "failed" }, expected)
        .reasons,
    ).toEqual(["MEASURE-FAILED"]);
    for (const patch of [
      { unit: "ms" },
      { source: "usage" },
      { reason: "NO-FIELD" },
    ]) {
      expect(
        adoptSavedTtft(
          expected,
          {
            runId: expected.runId,
            status: "measured",
            metrics: { ttft: { ...run().metrics.ttft, ...patch } },
          },
          expected,
        ).reasons,
      ).toEqual(["INVALID-TTFT"]);
    }
  });
  it("does not mutate saved evidence and does not borrow a metric from another row", () => {
    const input = fixture();
    const original = structuredClone(input);
    input.runs[1].runId = expected.runId;
    delete input.runs[1].metrics.ttft;
    const markdown = renderAdoptionReport(
      [input],
      expected.targetCommit,
      expected,
    );
    expect(markdown).toContain(
      "| 1 / 1 | ollama / synthetic-model | 0.25 | same execution; measured |",
    );
    expect(markdown).toContain(
      "| 1 / 2 | ollama / synthetic-model | not adopted | NO-FIELD",
    );
    expect(input.runs[0]).toEqual(original.runs[0]);
  });
  it("renders exact mismatch reasons and preserves raw evidence separately", () => {
    const input = fixture();
    const original = structuredClone(input);
    const markdown = renderAdoptionReport([input], expected.targetCommit, {
      ...expected,
      runId: "other",
    });
    expect(markdown).toContain("not adopted | RUN-ID-MISMATCH");
    expect(markdown).not.toContain("| 0.25 | same execution");
    expect(markdown).toContain('"value": 0.25');
    expect(input).toEqual(original);
    expect(() =>
      renderAdoptionReport([input], "2".repeat(40), expected),
    ).toThrow("TTFT-COMPARISON-COMMIT-MISMATCH");
  });
  it("reads the HTTP runner shape while rejecting absent producer provenance", () => {
    const input = fixture();
    const row = input.runs[0];
    row.quality = { value: null, reason: "NOT-RUN" };
    row.ttft = { ...row.metrics.ttft, reason: "FIRST-CONTENT" };
    row.metrics.peak_rss = { value: 512, unit: "MiB", source: "os-sampler" };
    input.runs = [row];
    delete input.execution;
    const missing = renderAdoptionReport(
      [input],
      expected.targetCommit,
      expected,
    );
    expect(missing).toContain(
      "not adopted | MISSING-RUNNER-VERSION, MISSING-COMMIT",
    );
    // Synthetic producer metadata exercises the future complete contract.
    input.execution = {
      runnerVersion: expected.runnerVersion,
      targetCommit: expected.targetCommit,
    };
    const complete = renderAdoptionReport(
      [input],
      expected.targetCommit,
      expected,
    );
    expect(complete).toContain("| 0.25 | same execution; measured |");
    expect(complete).toContain("MISSING-QUALITY");
    expect(complete).not.toContain("| pass |");
  });
  it("never substitutes artifact identity for a missing or different request ID", () => {
    for (const runId of [undefined, "other-request"]) {
      expect(
        adoptSavedTtft(expected, { ...run(), runId }, expected).value,
      ).toBeNull();
    }
  });
  it("requires the saved acquisition record to agree with the metric", () => {
    const recorded = { ...run().metrics.ttft, reason: "FIRST-CONTENT" };
    expect(
      adoptSavedTtft(expected, { ...run(), ttft: recorded }, expected).value,
    ).toBe(0.25);
    for (const patch of [
      { value: 7 },
      { unit: "ms" },
      { source: "usage" },
      { reason: "NO-CONTENT" },
    ]) {
      expect(
        adoptSavedTtft(
          expected,
          { ...run(), ttft: { ...recorded, ...patch } },
          expected,
        ).reasons,
      ).toEqual(["INVALID-TTFT"]);
    }
    const empty = {
      runId: expected.runId,
      status: "measured",
      metrics: { ttft: { value: null, unit: "s", reason: "NO-FIELD" } },
      ttft: { value: null, unit: "s", reason: "NO-CONTENT" },
    };
    expect(adoptSavedTtft(expected, empty, expected).reasons).toEqual([
      "NO-CONTENT",
    ]);
  });
  it("escapes selected run IDs rather than interpolating markup", () => {
    const markdown = renderAdoptionReport([fixture()], expected.targetCommit, {
      ...expected,
      runId: "<script>{{x}}|",
    });
    expect(markdown).not.toContain("<script>");
    expect(markdown).not.toContain("{{x}}");
  });
});

describe("fixed acquisition failures on the selected execution", () => {
  const missing = (reason: string, status = "failed") => ({
    runId: expected.runId,
    status,
    ttft: { value: null, unit: "s", reason },
    metrics: {
      ttft: {
        value: null,
        unit: "s",
        reason: status === "failed" ? "MEASURE-FAILED" : "NO-FIELD",
      },
    },
  });
  it.each([
    "HTTP-ERROR",
    "NO-BODY",
    "INVALID-STREAM",
    "STREAM-ERROR",
    "INCOMPLETE-STREAM",
    "TIMEOUT",
    "REQUEST-FAILED",
    "NO-CONTENT",
  ])("preserves %s only on matching provenance", (reason) => {
    const row = missing(
      reason,
      reason === "NO-CONTENT" ? "measured" : "failed",
    );
    expect(adoptSavedTtft(expected, row, expected)).toEqual({
      value: null,
      unit: "s",
      reasons: [reason],
    });
    for (const [key, value, code] of [
      ["runnerVersion", "local-inference/3", "RUNNER-VERSION-MISMATCH"],
      ["targetCommit", "2".repeat(40), "COMMIT-MISMATCH"],
    ])
      expect(
        adoptSavedTtft({ ...expected, [key]: value }, row, expected).reasons,
      ).toEqual([code]);
    expect(
      adoptSavedTtft(expected, { ...row, runId: "different" }, expected)
        .reasons,
    ).toEqual(["RUN-ID-MISMATCH"]);
  });
  it("rejects contradictory and unknown acquisition evidence without exposing raw errors", () => {
    const row = missing("TIMEOUT");
    for (const invalid of [
      { ...row, status: "measured" },
      { ...row, ttft: { ...row.ttft, reason: ["HTTP-ERROR"] } },
      { ...row, ttft: { ...row.ttft, reason: "secret-test-marker" } },
      { ...row, ttft: { ...row.ttft, value: 0.2 } },
      { ...row, ttft: { ...row.ttft, source: "client" } },
      {
        ...row,
        metrics: { ttft: { value: 0.2, unit: "s", source: "client" } },
      },
      {
        ...row,
        metrics: { ttft: { ...row.metrics.ttft, reason: "NO-FIELD" } },
      },
      {
        ...missing("NO-CONTENT", "measured"),
        metrics: { ttft: { value: 0, unit: "s", source: "client" } },
      },
    ])
      expect(adoptSavedTtft(expected, invalid, expected).reasons).toEqual([
        "INVALID-TTFT",
      ]);
  });
});
