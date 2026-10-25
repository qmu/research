import { describe, it, expect } from "vitest";
import { parseCliConfig } from "./run-strata-executor";

const validConfig = {
  command: "strata",
  args: ["bench", "run", "--protocol", "strata-qwen38-thinking-v1-draft.1"],
  timeoutMs: 60_000,
  outputsPath: "/tmp/outputs.jsonl",
  model: "qwen3.8-flash-next-iq3_s",
  runtimeVersion: "strata-0.0.0",
  condition: { pack: "IQ3_S" },
};

describe("parseCliConfig", () => {
  it("accepts a well-formed config", () => {
    expect(parseCliConfig(validConfig)).toMatchObject({
      command: "strata",
      timeoutMs: 60_000,
      outputsPath: "/tmp/outputs.jsonl",
    });
  });

  it("passes through an optional cwd", () => {
    const config = { ...validConfig, cwd: "/work" };
    expect(parseCliConfig(config).cwd).toBe("/work");
  });

  it("rejects a non-object input", () => {
    expect(() => parseCliConfig("not an object")).toThrow(
      "Expected a config object",
    );
  });

  it("rejects an empty command", () => {
    const config = { ...validConfig, command: "" };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects non-array args", () => {
    const config = { ...validConfig, args: "bench" };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects a zero timeoutMs", () => {
    const config = { ...validConfig, timeoutMs: 0 };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects a negative timeoutMs", () => {
    const config = { ...validConfig, timeoutMs: -1 };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects an empty outputsPath", () => {
    const config = { ...validConfig, outputsPath: "" };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects an empty model", () => {
    const config = { ...validConfig, model: "" };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects an empty runtimeVersion", () => {
    const config = { ...validConfig, runtimeVersion: "" };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects a condition value that is not a string/number/boolean", () => {
    const config = { ...validConfig, condition: { pack: {} } };
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects a null condition", () => {
    const config = { ...validConfig, condition: null };
    expect(() => parseCliConfig(config)).toThrow();
  });
});
