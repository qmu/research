// Pure domain logic for one Strata measurement: no process, no filesystem, no
// network, so every acceptance rule here is unit-testable without a real
// `strata` binary. The impure boundary (spawning the process, reading the
// outputs.jsonl file it writes) lives in `../vendors/strata-process` and
// `../strata-executor`; this module only classifies what they observed.

export type StrataGapReason = "TIMEOUT" | "EXIT-FAILED" | "INVALID-OUTPUT";

export type StrataMeasurement =
  | Readonly<{ value: number; unit: string; source: "client" | "usage" }>
  | Readonly<{ value: null; unit: string; reason: StrataGapReason }>;

export type StrataRunStatus =
  "measured" | "timeout" | "exit-failed" | "invalid-output";

export type StrataRunIdentity = Readonly<{
  model: string;
  runtimeVersion: string;
  condition: Readonly<Record<string, string | number | boolean>>;
}>;

// The row saved into the shared local-inference JSON. Deliberately excludes the
// generated text, the raw outputs.jsonl record and any stderr: only measured
// numbers, the run status and the process exit code are kept, matching this
// repository's convention of never persisting a model's response body or a raw
// upstream error into a committed/shared artifact.
export type StrataRun = StrataRunIdentity &
  Readonly<{
    engine: "strata";
    status: StrataRunStatus;
    exitCode: number | null;
    metrics: Readonly<{
      elapsedMs: StrataMeasurement;
      completionTokens: StrataMeasurement;
      tokensPerSecond: StrataMeasurement;
    }>;
  }>;

// What the process boundary observed, already stripped of anything that
// shouldn't reach the saved row. `completed` carries only the last non-empty
// line of the outputs.jsonl file Strata wrote (or `null` if the file was
// missing/empty) — never raw stdout.
export type StrataProcessOutcome =
  | Readonly<{ kind: "timeout" }>
  | Readonly<{ kind: "exit"; exitCode: number }>
  | Readonly<{ kind: "completed"; lastLine: string | null }>;

type StrataBenchAccepted = Readonly<{
  accepted: true;
  text: string;
  outputTokens: number;
  elapsedMs: number;
}>;
type StrataBenchRejected = Readonly<{ accepted: false; reason: string }>;
export type StrataBenchOutcome = StrataBenchAccepted | StrataBenchRejected;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonnegativeFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

// Validates one line of Strata's outputs.jsonl (one JSON object per
// `strata bench run` request). Never throws: an invalid, incomplete or
// unfinished record is a `{ accepted: false }` outcome with a reason that
// names the failed rule, not the record's own content — a `strata bench`
// error envelope can carry a local hostname or filesystem path, so it is never
// echoed. `finish_reason: "length"` (the token cap was hit) is accepted: it is
// a real measurement, just not evidence of answer quality.
export function parseStrataBenchLine(line: string): StrataBenchOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { accepted: false, reason: "not valid JSON" };
  }
  if (!isRecord(parsed)) {
    return { accepted: false, reason: "expected a JSON object" };
  }
  if (parsed.error !== null && parsed.error !== undefined) {
    return { accepted: false, reason: "record reports an error" };
  }
  if (parsed.http_status !== 200) {
    return { accepted: false, reason: "http_status is not 200" };
  }
  if (parsed.finish_reason !== "stop" && parsed.finish_reason !== "length") {
    return {
      accepted: false,
      reason: "finish_reason is not a finished text completion",
    };
  }
  const finalAnswer = parsed.final_answer;
  if (typeof finalAnswer !== "string") {
    return { accepted: false, reason: "final_answer is not a string" };
  }
  const usage = parsed.usage;
  if (!isRecord(usage)) {
    return { accepted: false, reason: "usage is missing or not an object" };
  }
  const completionTokens = usage.completion_tokens;
  if (!isNonnegativeFiniteNumber(completionTokens)) {
    return {
      accepted: false,
      reason: "usage.completion_tokens is missing or invalid",
    };
  }
  if (!Number.isSafeInteger(completionTokens)) {
    return {
      accepted: false,
      reason: "usage.completion_tokens is not a safe integer",
    };
  }
  const start = parsed.dispatch_offset_s;
  const end = parsed.end_offset_s;
  if (!isNonnegativeFiniteNumber(start) || !isNonnegativeFiniteNumber(end)) {
    return {
      accepted: false,
      reason: "dispatch_offset_s/end_offset_s are missing or inconsistent",
    };
  }
  if (end < start) {
    return {
      accepted: false,
      reason: "dispatch_offset_s/end_offset_s are missing or inconsistent",
    };
  }
  return {
    accepted: true,
    text: finalAnswer,
    outputTokens: completionTokens,
    elapsedMs: (end - start) * 1000,
  };
}

const gap = (unit: string, reason: StrataGapReason): StrataMeasurement => ({
  value: null,
  unit,
  reason,
});
const measured = (
  value: number,
  unit: string,
  source: "client" | "usage",
): StrataMeasurement => ({ value, unit, source });

const gapMetrics = (reason: StrataGapReason): StrataRun["metrics"] => ({
  elapsedMs: gap("ms", reason),
  completionTokens: gap("tokens", reason),
  tokensPerSecond: gap("tokens/s", reason),
});

// Assembles the saved row from one execution's identity and outcome. This is
// the one place that decides what "exit", "timeout" and "measured" mean for the
// common JSON — every other function here only feeds it an outcome.
export function buildStrataRun(
  identity: StrataRunIdentity,
  outcome: StrataProcessOutcome,
): StrataRun {
  if (outcome.kind === "timeout") {
    return {
      ...identity,
      engine: "strata",
      status: "timeout",
      exitCode: null,
      metrics: gapMetrics("TIMEOUT"),
    };
  }
  if (outcome.kind === "exit") {
    return {
      ...identity,
      engine: "strata",
      status: "exit-failed",
      exitCode: outcome.exitCode,
      metrics: gapMetrics("EXIT-FAILED"),
    };
  }
  const parsed =
    outcome.lastLine === null ? null : parseStrataBenchLine(outcome.lastLine);
  if (parsed === null || !parsed.accepted) {
    return {
      ...identity,
      engine: "strata",
      status: "invalid-output",
      exitCode: 0,
      metrics: gapMetrics("INVALID-OUTPUT"),
    };
  }
  const throughput = parsed.outputTokens / (parsed.elapsedMs / 1000);
  const tokensPerSecond =
    parsed.elapsedMs > 0
      ? measured(throughput, "tokens/s", "client")
      : gap("tokens/s", "INVALID-OUTPUT");
  return {
    ...identity,
    engine: "strata",
    status: "measured",
    exitCode: 0,
    metrics: {
      elapsedMs: measured(parsed.elapsedMs, "ms", "client"),
      completionTokens: measured(parsed.outputTokens, "tokens", "usage"),
      tokensPerSecond,
    },
  };
}
