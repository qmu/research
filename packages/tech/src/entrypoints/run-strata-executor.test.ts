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
    expect(parseCliConfig({ ...validConfig, cwd: "/work" }).cwd).toBe(
      "/work",
    );
  });

  it.each([
    ["command", { ...validConfig, command: "" }],
    ["args", { ...validConfig, args: "bench" }],
    ["timeoutMs", { ...validConfig, timeoutMs: 0 }],
    ["timeoutMs", { ...validConfig, timeoutMs: -1 }],
    ["outputsPath", { ...validConfig, outputsPath: "" }],
    ["model", { ...validConfig, model: "" }],
    ["runtimeVersion", { ...validConfig, runtimeVersion: "" }],
    ["condition", { ...validConfig, condition: { pack: {} } }],
    ["condition", { ...validConfig, condition: null }],
  ])("rejects an invalid %s", (_field, config) => {
    expect(() => parseCliConfig(config)).toThrow();
  });

  it("rejects a non-object input", () => {
    expect(() => parseCliConfig("not an object")).toThrow(
      "Expected a config object",
    );
  });
});
