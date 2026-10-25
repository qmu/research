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

const expectInvalid = (file: unknown, matcher: RegExp): void => {
  expect(() => parseComparisonSnapshotFile(file)).toThrow(matcher);
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
    expectInvalid(
      { ...validFile, schemaVersion: 2 },
      /unsupported schemaVersion/,
    );
  });

  it("rejects a missing snapshots array", () => {
    expectInvalid({ schemaVersion: 1 }, /snapshots array/);
  });

  for (const field of [
    "id",
    "engineVersion",
    "model",
    "fixtureVersion",
    "runnerVersion",
  ]) {
    it(`rejects a missing or empty ${field}`, () => {
      expectInvalid(
        { schemaVersion: 1, snapshots: [{ ...validSnapshot, [field]: "" }] },
        new RegExp(`${field} must be a nonempty string`),
      );
    });
  }

  it("rejects an invalid verdict", () => {
    expectInvalid(
      { schemaVersion: 1, snapshots: [{ ...validSnapshot, verdict: "maybe" }] },
      /verdict must be "adopted" or "rejected"/,
    );
  });

  it("rejects a rejected snapshot with no reasonCode", () => {
    expectInvalid(
      {
        schemaVersion: 1,
        snapshots: [{ ...validSnapshot, verdict: "rejected" }],
      },
      /carries no reasonCode/,
    );
  });

  it("rejects a duplicate snapshot id", () => {
    expectInvalid(
      { schemaVersion: 1, snapshots: [validSnapshot, validSnapshot] },
      /duplicate snapshot id/,
    );
  });
});
