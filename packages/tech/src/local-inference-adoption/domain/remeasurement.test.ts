import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  remeasurementContext,
  verifyRemeasurementSnapshot,
} from "./remeasurement.js";
import { renderAdoptionReport } from "./adoption.js";

const identity = {
  runId: "snapshot-one",
  targetCommit: "1".repeat(40),
  runnerVersion: "local-inference/4",
};
const baseline = () => {
  const data = JSON.parse(
    readFileSync("src/local-inference-adoption/fixtures/baseline.json", "utf8"),
  );
  data.execution = { ...identity };
  return data;
};
describe("snapshot-bound remeasurement", () => {
  it("copies only the complete identity, preserving the original", () => {
    const input = { ...identity, rawCommand: "private-marker" };
    const result = remeasurementContext(input);
    expect(result).toEqual(identity);
    expect(result).not.toBe(input);
    expect(input.rawCommand).toBe("private-marker");
  });
  it.each(["runId", "targetCommit", "runnerVersion"])(
    "blocks a missing or changed %s without fallback",
    (key) => {
      const saved = baseline();
      delete saved.execution[key];
      expect(remeasurementContext(saved.execution)).toBeNull();
      expect(() => verifyRemeasurementSnapshot(saved, identity)).toThrow(
        "SNAPSHOT-IDENTITY-MISMATCH",
      );
      const changed = {
        ...identity,
        [key]:
          key === "targetCommit"
            ? "2".repeat(40)
            : key === "runnerVersion"
              ? "local-inference/3"
              : "snapshot-two",
      };
      expect(() => verifyRemeasurementSnapshot(baseline(), changed)).toThrow();
    },
  );
  it.each([
    "",
    " ",
    "../snapshot",
    "x;echo",
    "x\nnext",
    "x`id`",
    "x{{secret}}",
    "x".repeat(129),
  ])("rejects unsafe execution IDs: %j", (runId) => {
    expect(remeasurementContext({ ...identity, runId })).toBeNull();
  });
  it.each(["HEAD", "1".repeat(7), "A".repeat(40), " " + "1".repeat(40)])(
    "rejects noncanonical commit %j",
    (targetCommit) => {
      expect(remeasurementContext({ ...identity, targetCommit })).toBeNull();
    },
  );
  it.each([
    undefined,
    null,
    "",
    "local-inference/999",
    " local-inference/4",
    {},
  ])("rejects unknown runner %j", (runnerVersion) => {
    expect(remeasurementContext({ ...identity, runnerVersion })).toBeNull();
  });
  it("keeps each source identity separate, including a commit mismatch", () => {
    const a = baseline();
    const b = baseline();
    b.execution.runId = "snapshot-two";
    b.execution.targetCommit = "2".repeat(40);
    b.execution.runnerVersion = "local-inference/3";
    const html = renderAdoptionReport([a, b], identity.targetCommit);
    expect(html).toContain("[Remeasure snapshot](#remeasure-source-1)");
    expect(html).toContain("[Remeasure snapshot](#remeasure-source-2)");
    expect(html).toContain(
      `snapshot-two ${"2".repeat(40)} local-inference/3 snapshot.json`,
    );
    expect(html).not.toContain("latest.json");
    expect(verifyRemeasurementSnapshot(b, b.execution)).toEqual(b.execution);
    expect(() => verifyRemeasurementSnapshot(b, identity)).toThrow();
  });
  it("does not offer a bound link for incomplete or hostile metadata", () => {
    const saved = baseline();
    saved.execution.runId = "private-marker<script>";
    const output = renderAdoptionReport([saved], identity.targetCommit);
    expect(output).toContain(
      "Remeasurement unavailable: incomplete snapshot identity",
    );
    expect(output).not.toContain("](#remeasure-source-");
    expect(output).not.toContain("private-marker");
  });
});
