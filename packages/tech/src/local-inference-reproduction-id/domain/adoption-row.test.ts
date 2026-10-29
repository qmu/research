import { describe, expect, it } from "vitest";
import { reproductionId } from "./identity";
import { parseAdoptionRowFile } from "./adoption-row";

const conditions = {
  engine: "vllm",
  model: "llama-3.1-8b-instruct",
  fixture: "fixture-2026-08-01",
  runnerVersion: "runner-1.4.0",
  targetCommit: "abcdef0123456789abcdef0123456789abcdef01",
};

const validFile = {
  schemaVersion: 1 as const,
  rows: [{ ...conditions, verdict: "adopted" as const }],
};

describe("parseAdoptionRowFile", () => {
  it("parses a valid adopted row and attaches its reproductionId", () => {
    const rows = parseAdoptionRowFile(validFile);
    expect(rows).toHaveLength(1);
    expect(rows[0].reproductionId).toBe(reproductionId(conditions));
    expect(rows[0].verdict).toBe("adopted");
  });

  it("parses a valid rejected row with a reasonCode", () => {
    const rows = parseAdoptionRowFile({
      schemaVersion: 1,
      rows: [
        {
          ...conditions,
          verdict: "rejected",
          reasonCode: "QUALITY-BELOW-THRESHOLD",
        },
      ],
    });
    expect(rows[0].reasonCode).toBe("QUALITY-BELOW-THRESHOLD");
  });

  it("ignores unknown keys on a row", () => {
    const rows = parseAdoptionRowFile({
      schemaVersion: 1,
      rows: [
        { ...conditions, verdict: "adopted", apiKey: "should-not-be-read" },
      ],
    });
    expect(rows[0]).not.toHaveProperty("apiKey");
  });

  it.each([
    [null, /must be an object/],
    [{ schemaVersion: 2, rows: [] }, /unsupported schemaVersion/],
    [{ schemaVersion: 1 }, /rows array/],
    [
      {
        schemaVersion: 1,
        rows: [{ ...conditions, engine: "", verdict: "adopted" }],
      },
      /rows\[0\]\.engine/,
    ],
    [
      { schemaVersion: 1, rows: [{ ...conditions, verdict: "maybe" }] },
      /verdict/,
    ],
    [
      { schemaVersion: 1, rows: [{ ...conditions, verdict: "rejected" }] },
      /no reasonCode/,
    ],
    [
      {
        schemaVersion: 1,
        rows: [{ ...conditions, verdict: "adopted", reasonCode: "" }],
      },
      /reasonCode/,
    ],
  ])("rejects invalid input %#", (raw, message) => {
    expect(() => parseAdoptionRowFile(raw)).toThrow(message);
  });

  it("rejects two rows that resolve to the same reproductionId", () => {
    expect(() =>
      parseAdoptionRowFile({
        schemaVersion: 1,
        rows: [
          { ...conditions, verdict: "adopted" },
          {
            ...conditions,
            targetCommit: conditions.targetCommit.toUpperCase(),
            verdict: "rejected",
            reasonCode: "X",
          },
        ],
      }),
    ).toThrow(/duplicate reproduction id/);
  });
});
