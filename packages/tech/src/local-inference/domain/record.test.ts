import { describe, expect, it } from "vitest";
import { parseComparisonFile } from "./record";

const validRun = {
  id: "ollama-1",
  backend: "ollama",
  modelCondition: {
    model: "llama-3.1-8b-instruct",
    quantization: "Q4_K_M",
    condition: "ctx=4096, temp=0.2, seed=7",
  },
  runner: { name: "ollama", version: "0.4.7" },
  commandFingerprint: `sha256:${"a".repeat(64)}`,
};

const validFile = {
  schemaVersion: 1,
  fixture: true,
  runs: [validRun],
};

describe("parseComparisonFile", () => {
  it("parses a valid file and copies through only the allowlisted fields", () => {
    const parsed = parseComparisonFile(validFile);
    expect(parsed).toEqual({
      schemaVersion: 1,
      fixture: true,
      runs: [
        {
          id: "ollama-1",
          backend: "ollama",
          modelCondition: {
            model: "llama-3.1-8b-instruct",
            quantization: "Q4_K_M",
            condition: "ctx=4096, temp=0.2, seed=7",
          },
          runner: { name: "ollama", version: "0.4.7" },
          commandFingerprint: validRun.commandFingerprint,
        },
      ],
    });
  });

  it("drops unknown fields instead of carrying them through", () => {
    const withSecret = {
      ...validFile,
      runs: [
        {
          ...validRun,
          apiKey: "sk-should-never-appear",
          rawCommand: "ollama run --api-key sk-should-never-appear",
        },
      ],
    };
    const parsed = parseComparisonFile(withSecret);
    expect(JSON.stringify(parsed)).not.toContain("sk-should-never-appear");
    expect(parsed.runs[0]).not.toHaveProperty("apiKey");
    expect(parsed.runs[0]).not.toHaveProperty("rawCommand");
  });

  it("rejects an unsupported schema version", () => {
    expect(() =>
      parseComparisonFile({ ...validFile, schemaVersion: 2 }),
    ).toThrow(/unsupported schemaVersion/);
  });

  it("rejects a non-boolean fixture flag", () => {
    expect(() => parseComparisonFile({ ...validFile, fixture: "yes" })).toThrow(
      /fixture must be a boolean/,
    );
  });

  it("rejects duplicate run ids", () => {
    expect(() =>
      parseComparisonFile({ ...validFile, runs: [validRun, validRun] }),
    ).toThrow(/duplicate run id/);
  });

  it("rejects a missing model condition field", () => {
    const incompleteCondition = {
      model: validRun.modelCondition.model,
      quantization: validRun.modelCondition.quantization,
    };
    expect(() =>
      parseComparisonFile({
        ...validFile,
        runs: [{ ...validRun, modelCondition: incompleteCondition }],
      }),
    ).toThrow(/modelCondition\.condition/);
  });

  it("rejects a missing runner version", () => {
    expect(() =>
      parseComparisonFile({
        ...validFile,
        runs: [{ ...validRun, runner: { name: "ollama" } }],
      }),
    ).toThrow(/runner\.version/);
  });

  it("rejects a command fingerprint that is not a sha256 digest", () => {
    expect(() =>
      parseComparisonFile({
        ...validFile,
        runs: [{ ...validRun, commandFingerprint: "not-a-digest" }],
      }),
    ).toThrow(/commandFingerprint/);
  });

  it("rejects a command fingerprint carrying a raw secret instead of a digest", () => {
    expect(() =>
      parseComparisonFile({
        ...validFile,
        runs: [
          {
            ...validRun,
            commandFingerprint: "sk-live-abcdef0123456789abcdef0123456789",
          },
        ],
      }),
    ).toThrow(/commandFingerprint/);
  });

  it("rejects a non-object input", () => {
    expect(() => parseComparisonFile(null)).toThrow(/must be a JSON object/);
    expect(() => parseComparisonFile("oops")).toThrow(/must be a JSON object/);
  });

  it("rejects runs that are not an array", () => {
    expect(() => parseComparisonFile({ ...validFile, runs: {} })).toThrow(
      /runs must be an array/,
    );
  });

  it("accepts an empty runs array", () => {
    expect(parseComparisonFile({ ...validFile, runs: [] }).runs).toEqual([]);
  });
});
