import { describe, expect, it } from "vitest";
import { verifiedDownloadSnapshot } from "./snapshot.js";

const identity = {
  runId: "run-123",
  targetCommit: "a".repeat(40),
  runnerVersion: "local-inference/4",
};
const text = (execution: unknown = identity) =>
  JSON.stringify(
    { execution, runs: [{ engine: "strata", metrics: null }] },
    null,
    2,
  ) + "\n";

describe("verified download snapshot", () => {
  it.each([2, 3, 4])("returns the exact validated text for runner %s", (v) => {
    const expected = { ...identity, runnerVersion: `local-inference/${v}` };
    const source = text(expected);
    expect(verifiedDownloadSnapshot(source, expected)).toBe(source);
  });

  it.each([
    ["runId", "another-run"],
    ["targetCommit", "b".repeat(40)],
    ["runnerVersion", "local-inference/3"],
  ])("rejects mismatched %s", (key, value) => {
    expect(() =>
      verifiedDownloadSnapshot(text({ ...identity, [key]: value }), identity),
    ).toThrow("DOWNLOAD-IDENTITY-MISMATCH");
  });

  it.each(["runId", "targetCommit", "runnerVersion"])(
    "rejects missing or invalid %s on either side",
    (key) => {
      for (const value of [undefined, null, "", " ", 42, {}, "unknown"]) {
        const bad = { ...identity, [key]: value };
        expect(() => verifiedDownloadSnapshot(text(bad), identity)).toThrow();
        expect(() => verifiedDownloadSnapshot(text(), bad)).toThrow();
      }
    },
  );

  it.each([
    "{",
    "null",
    "[]",
    "{}",
    JSON.stringify({ execution: identity, runs: {} }),
    JSON.stringify({ execution: [identity], runs: [] }),
  ])("rejects invalid envelopes without returning content: %s", (source) => {
    expect(() => verifiedDownloadSnapshot(source, identity)).toThrow();
  });

  it("does not accept abbreviated commits, padded identities or future runners", () => {
    for (const patch of [
      { targetCommit: "aaaaaaa" },
      { targetCommit: "A".repeat(40) },
      { runId: " run-123" },
      { runnerVersion: "local-inference/5" },
      { runnerVersion: "local-inference/4 " },
    ]) {
      expect(() =>
        verifiedDownloadSnapshot(text({ ...identity, ...patch }), identity),
      ).toThrow();
    }
  });
});
