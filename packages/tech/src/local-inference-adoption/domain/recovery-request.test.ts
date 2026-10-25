import { expect, it } from "vitest";
import {
  snapshotFailureReasons,
  snapshotRecoveryRequest,
} from "./recovery-request.js";

const expected = {
  runId: "snapshot-one",
  targetCommit: "1".repeat(40),
  runnerVersion: "local-inference/2",
};

it.each(snapshotFailureReasons)(
  "pins the original context for %s",
  (reason) => {
    const input = Object.freeze({
      ...expected,
      privateCommand: "private-marker",
    });
    const result = snapshotRecoveryRequest(input, reason);
    expect(result).toEqual({
      kind: "remeasurement-request",
      schemaVersion: 1,
      reason,
      source: expected,
      requiresNewExecutionId: true,
      requiresNewArtifact: true,
    });
    expect(result.source).not.toBe(input);
    expect(JSON.stringify(result)).not.toContain("private-marker");
  },
);

it.each([
  { ...expected, targetCommit: "main" },
  { ...expected, targetCommit: "" },
  { ...expected, runnerVersion: "latest" },
  { ...expected, runnerVersion: "" },
  { ...expected, runId: "" },
  null,
])("does not invent missing or invalid context: %j", (input) => {
  expect(() =>
    snapshotRecoveryRequest(input, snapshotFailureReasons[0]),
  ).toThrow("INVALID-RECOVERY-REQUEST");
});

it.each(["private-marker", "RENDER-FAILED", null, {}])(
  "refuses non-acquisition reasons: %j",
  (reason) => {
    expect(() => snapshotRecoveryRequest(expected, reason)).toThrow(
      "INVALID-RECOVERY-REQUEST",
    );
  },
);
