import { describe, it, expect } from "vitest";
import {
  parseStrataBenchLine,
  buildStrataRun,
  type StrataRunIdentity,
} from "./strata-run";

const validLine = JSON.stringify({
  final_answer: "A hash table finds a value with a hash function.",
  finish_reason: "stop",
  usage: { completion_tokens: 128 },
  error: null,
  http_status: 200,
  dispatch_offset_s: 0,
  end_offset_s: 3.4,
});

describe("parseStrataBenchLine", () => {
  it("accepts a well-formed finished record", () => {
    expect(parseStrataBenchLine(validLine)).toEqual({
      accepted: true,
      text: "A hash table finds a value with a hash function.",
      outputTokens: 128,
      elapsedMs: 3400,
    });
  });

  it("accepts the length finish_reason (token cap)", () => {
    const line = JSON.stringify({
      final_answer: "truncated",
      finish_reason: "length",
      usage: { completion_tokens: 1024 },
      error: null,
      http_status: 200,
      dispatch_offset_s: 1,
      end_offset_s: 2,
    });
    expect(parseStrataBenchLine(line)).toMatchObject({ accepted: true });
  });

  it("rejects invalid JSON without throwing", () => {
    expect(parseStrataBenchLine("not json")).toEqual({
      accepted: false,
      reason: "not valid JSON",
    });
  });

  it("rejects a non-object JSON value", () => {
    expect(parseStrataBenchLine("[1,2,3]")).toEqual({
      accepted: false,
      reason: "expected a JSON object",
    });
  });

  it("rejects a record reporting an error, without echoing it", () => {
    const line = JSON.stringify({
      ...JSON.parse(validLine),
      error: "connection refused at 192.168.1.5:8080",
    });
    const result = parseStrataBenchLine(line);
    expect(result).toEqual({
      accepted: false,
      reason: "record reports an error",
    });
    expect(JSON.stringify(result)).not.toContain("192.168.1.5");
  });

  it("rejects a non-200 http_status", () => {
    const line = JSON.stringify({ ...JSON.parse(validLine), http_status: 500 });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "http_status is not 200",
    });
  });

  it("rejects an unfinished/tool-call completion", () => {
    const line = JSON.stringify({
      ...JSON.parse(validLine),
      finish_reason: "tool_call",
    });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "finish_reason is not a finished text completion",
    });
  });

  it("rejects a missing final_answer", () => {
    const { final_answer: _drop, ...rest } = JSON.parse(validLine);
    expect(parseStrataBenchLine(JSON.stringify(rest))).toEqual({
      accepted: false,
      reason: "final_answer is not a string",
    });
  });

  it("rejects a record with no usage object at all", () => {
    const { usage: _drop, ...rest } = JSON.parse(validLine);
    expect(parseStrataBenchLine(JSON.stringify(rest))).toEqual({
      accepted: false,
      reason: "usage is missing or not an object",
    });
  });

  it("rejects a missing usage.completion_tokens", () => {
    const line = JSON.stringify({ ...JSON.parse(validLine), usage: {} });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "usage.completion_tokens is missing or invalid",
    });
  });

  it("rejects a negative usage.completion_tokens", () => {
    const line = JSON.stringify({
      ...JSON.parse(validLine),
      usage: { completion_tokens: -1 },
    });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "usage.completion_tokens is missing or invalid",
    });
  });

  it("rejects a non-integer usage.completion_tokens", () => {
    const line = JSON.stringify({
      ...JSON.parse(validLine),
      usage: { completion_tokens: 12.5 },
    });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "usage.completion_tokens is not a safe integer",
    });
  });

  it("rejects an end_offset_s before dispatch_offset_s", () => {
    const line = JSON.stringify({
      ...JSON.parse(validLine),
      dispatch_offset_s: 5,
      end_offset_s: 1,
    });
    expect(parseStrataBenchLine(line)).toEqual({
      accepted: false,
      reason: "dispatch_offset_s/end_offset_s are missing or inconsistent",
    });
  });
});

const identity: StrataRunIdentity = {
  model: "qwen3.8-flash-next-iq3_s",
  runtimeVersion: "strata-0.0.0",
  condition: { pack: "IQ3_S" },
};

describe("buildStrataRun", () => {
  it("records a timeout with null metrics and no exit code", () => {
    const run = buildStrataRun(identity, { kind: "timeout" });
    expect(run.status).toBe("timeout");
    expect(run.exitCode).toBeNull();
    expect(run.metrics.elapsedMs).toEqual({
      value: null,
      unit: "ms",
      reason: "TIMEOUT",
    });
    expect(run.metrics.completionTokens).toEqual({
      value: null,
      unit: "tokens",
      reason: "TIMEOUT",
    });
  });

  it("records a nonzero exit with its code and null metrics", () => {
    const run = buildStrataRun(identity, { kind: "exit", exitCode: 137 });
    expect(run.status).toBe("exit-failed");
    expect(run.exitCode).toBe(137);
    expect(run.metrics.tokensPerSecond).toEqual({
      value: null,
      unit: "tokens/s",
      reason: "EXIT-FAILED",
    });
  });

  it("records invalid-output when exit 0 wrote nothing", () => {
    const run = buildStrataRun(identity, {
      kind: "completed",
      lastLine: null,
    });
    expect(run.status).toBe("invalid-output");
    expect(run.exitCode).toBe(0);
  });

  it("records invalid-output when the last line fails validation", () => {
    const run = buildStrataRun(identity, {
      kind: "completed",
      lastLine: "not json",
    });
    expect(run.status).toBe("invalid-output");
    expect(run.exitCode).toBe(0);
  });

  it("records measured metrics from a valid last line", () => {
    const run = buildStrataRun(identity, {
      kind: "completed",
      lastLine: validLine,
    });
    expect(run.status).toBe("measured");
    expect(run.exitCode).toBe(0);
    expect(run.metrics.elapsedMs).toEqual({
      value: 3400,
      unit: "ms",
      source: "client",
    });
    expect(run.metrics.completionTokens).toEqual({
      value: 128,
      unit: "tokens",
      source: "usage",
    });
    expect(run.metrics.tokensPerSecond).toMatchObject({
      source: "client",
      unit: "tokens/s",
    });
    if (run.metrics.tokensPerSecond.value !== null) {
      expect(run.metrics.tokensPerSecond.value).toBeCloseTo(
        128 / 3.4,
        5,
      );
    }
  });

  it("never persists the generated text", () => {
    const run = buildStrataRun(identity, {
      kind: "completed",
      lastLine: validLine,
    });
    expect(JSON.stringify(run)).not.toContain("hash table");
  });

  it("gaps tokensPerSecond instead of dividing by zero elapsedMs", () => {
    const zeroElapsedLine = JSON.stringify({
      ...JSON.parse(validLine),
      dispatch_offset_s: 1,
      end_offset_s: 1,
    });
    const run = buildStrataRun(identity, {
      kind: "completed",
      lastLine: zeroElapsedLine,
    });
    expect(run.metrics.tokensPerSecond).toEqual({
      value: null,
      unit: "tokens/s",
      reason: "INVALID-OUTPUT",
    });
    expect(run.metrics.elapsedMs).toEqual({
      value: 0,
      unit: "ms",
      source: "client",
    });
  });

  it("carries the run identity through unchanged", () => {
    const run = buildStrataRun(identity, { kind: "timeout" });
    expect(run.model).toBe(identity.model);
    expect(run.runtimeVersion).toBe(identity.runtimeVersion);
    expect(run.condition).toEqual(identity.condition);
    expect(run.engine).toBe("strata");
  });
});
