import { describe, expect, it } from "vitest";
import { parseComparisonSnapshotFile } from "./snapshot";

const validSnapshot = {
  id: "llama-cpp-8b-q4",
  engineVersion: "llama.cpp b3985",
  model: "llama-3.1-8b-instruct-q4_k_m",
  fixtureVersion: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  verdict: "adopted",
};

const validFile = {
  schemaVersion: 1,
  snapshots: [validSnapshot],
};

describe("parseComparisonSnapshotFile", () => {
  it("parses a valid adopted snapshot", () => {
    const parsed = parseComparisonSnapshotFile(validFile);
    expect(parsed.snapshots).toEqual([validSnapshot]);
  });

  it("parses a valid rejected snapshot with a reasonCode", () => {
    const rejected = {
      ...validSnapshot,
      id: "ollama-8b-q4",
      verdict: "rejected",
      reasonCode: "runner-version-mismatch",
    };
    const parsed = parseComparisonSnapshotFile({
      schemaVersion: 1,
      snapshots: [rejected],
    });
    expect(parsed.snapshots).toEqual([rejected]);
  });

  it("ignores unknown keys on the file and on a snapshot", () => {
    const parsed = parseComparisonSnapshotFile({
      schemaVersion: 1,
      extraTopLevel: "sk-live-should-not-survive",
      snapshots: [{ ...validSnapshot, apiKey: "sk-live-should-not-survive" }],
    });
    expect(parsed).toEqual({ schemaVersion: 1, snapshots: [validSnapshot] });
  });

  it("rejects an unsupported schemaVersion", () => {
    expect(() =>
      parseComparisonSnapshotFile({ ...validFile, schemaVersion: 2 }),
    ).toThrow(/unsupported schemaVersion/);
  });

  it("rejects a missing snapshots array", () => {
    expect(() =>
      parseComparisonSnapshotFile({ schemaVersion: 1 }),
    ).toThrow(/snapshots array/);
  });

  for (const field of [
    "id",
    "engineVersion",
    "model",
    "fixtureVersion",
    "runnerVersion",
  ]) {
    it(`rejects a missing or empty ${field}`, () => {
      expect(() =>
        parseComparisonSnapshotFile({
          schemaVersion: 1,
          snapshots: [{ ...validSnapshot, [field]: "" }],
        }),
      ).toThrow(new RegExp(`${field} must be a nonempty string`));
    });
  }

  it("rejects an invalid verdict", () => {
    expect(() =>
      parseComparisonSnapshotFile({
        schemaVersion: 1,
        snapshots: [{ ...validSnapshot, verdict: "maybe" }],
      }),
    ).toThrow(/verdict must be "adopted" or "rejected"/);
  });

  it("rejects a rejected snapshot with no reasonCode", () => {
    expect(() =>
      parseComparisonSnapshotFile({
        schemaVersion: 1,
        snapshots: [{ ...validSnapshot, verdict: "rejected" }],
      }),
    ).toThrow(/carries no reasonCode/);
  });

  it("rejects a duplicate snapshot id", () => {
    expect(() =>
      parseComparisonSnapshotFile({
        schemaVersion: 1,
        snapshots: [validSnapshot, validSnapshot],
      }),
    ).toThrow(/duplicate snapshot id/);
  });
});
