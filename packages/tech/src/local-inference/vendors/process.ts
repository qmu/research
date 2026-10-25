import { spawn } from "node:child_process";
import {
  beginExecution,
  completeExecution,
  type Execution,
} from "./versioned-result.js";

export type Engine = "strata" | "ollama" | "llama.cpp" | "mlx";
export type OutputLimits = { stdoutBytes: number; stderrBytes: number };

// Limits apply independently to raw bytes, before Base64/JSON encoding.
export const ENGINE_OUTPUT_LIMITS: Readonly<
  Record<Engine, Readonly<OutputLimits>>
> = Object.freeze({
  strata: Object.freeze({
    stdoutBytes: 4 * 1024 * 1024,
    stderrBytes: 256 * 1024,
  }),
  ollama: Object.freeze({ stdoutBytes: 1024 * 1024, stderrBytes: 256 * 1024 }),
  "llama.cpp": Object.freeze({
    stdoutBytes: 1024 * 1024,
    stderrBytes: 512 * 1024,
  }),
  mlx: Object.freeze({ stdoutBytes: 1024 * 1024, stderrBytes: 256 * 1024 }),
});

type CapturedOutput = {
  encoding: "base64";
  data: string;
  limit_bytes: number;
  captured_bytes: number;
  discarded_bytes: number;
  truncation_reason: "BYTE_LIMIT" | null;
};

function capture(limit: number) {
  const chunks: Buffer[] = [];
  let captured = 0;
  let discarded = 0;
  return {
    append(chunk: Buffer) {
      const keep = Math.min(chunk.length, limit - captured);
      // Copy the prefix so a small slice cannot retain a discarded large buffer.
      if (keep > 0) chunks.push(Buffer.from(chunk.subarray(0, keep)));
      captured += keep;
      discarded += chunk.length - keep;
    },
    result(): CapturedOutput {
      return {
        encoding: "base64",
        data: Buffer.concat(chunks, captured).toString("base64"),
        limit_bytes: limit,
        captured_bytes: captured,
        discarded_bytes: discarded,
        truncation_reason: discarded > 0 ? "BYTE_LIMIT" : null,
      };
    },
  };
}

export type ProcessResult = {
  schema_version: 1;
  engine: Engine;
  status: "ok" | "failed";
  process: { exit_code: number | null; signal: NodeJS.Signals | null };
  output: { stdout: CapturedOutput; stderr: CapturedOutput };
  failure: {
    code: "TIMEOUT" | "CANCELLED" | "UNREACHABLE" | "MEASURE-FAILED";
  } | null;
};

/** Run one measurement command, retaining bounded raw output in the local artifact. */
export async function measureProcess(options: {
  engine: Engine;
  command: string;
  args?: string[];
  timeoutMs: number;
  signal?: AbortSignal;
  outputLimits?: OutputLimits;
}): Promise<ProcessResult> {
  if (
    !Number.isFinite(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 2_147_483_647
  )
    throw new Error("timeoutMs must be between 1 and 2147483647");
  const limits = options.outputLimits ?? ENGINE_OUTPUT_LIMITS[options.engine];
  for (const limit of [limits.stdoutBytes, limits.stderrBytes]) {
    if (!Number.isSafeInteger(limit) || limit < 0 || limit > 16 * 1024 * 1024)
      throw new Error("output limits must be integers between 0 and 16777216");
  }
  const stdout = capture(limits.stdoutBytes);
  const stderr = capture(limits.stderrBytes);
  const result = (
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    code: NonNullable<ProcessResult["failure"]>["code"] | null,
  ): ProcessResult => ({
    schema_version: 1,
    engine: options.engine,
    status: code === null ? "ok" : "failed",
    process: { exit_code: exitCode, signal },
    output: { stdout: stdout.result(), stderr: stderr.result() },
    failure: code === null ? null : { code },
  });
  if (options.signal?.aborted) return result(null, null, "CANCELLED");
  return new Promise((resolve) => {
    // Keep draining both pipes after the cap; truncation must not change the
    // child's exit code or deadlock a command that writes more than a pipe holds.
    const child = spawn(options.command, options.args ?? [], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", stdout.append);
    child.stderr.on("data", stderr.append);
    let reason: "TIMEOUT" | "CANCELLED" | undefined;
    let spawnFailed = false;
    const stop = (code: "TIMEOUT" | "CANCELLED") => {
      reason ??= code;
      child.kill("SIGKILL");
    };
    const cancel = () => stop("CANCELLED");
    const timer = setTimeout(() => stop("TIMEOUT"), options.timeoutMs);
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) cancel();
    child.on("error", () => {
      spawnFailed = true;
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", cancel);
      resolve(
        result(
          spawnFailed ? null : code,
          signal,
          reason ??
            (spawnFailed
              ? "UNREACHABLE"
              : code === 0 && signal === null
                ? null
                : signal === "SIGINT"
                  ? "CANCELLED"
                  : "MEASURE-FAILED"),
        ),
      );
    });
  });
}

/**
 * Reserves an execution before measuring and publishes through the same
 * version-fenced atomic save as the common inference JSON (`run.ts`), so a
 * slower stale measurement can never clobber newer evidence for the same
 * path, and the saved JSON carries the same `execution.{runId,version}` field.
 */
export async function saveProcessMeasurement(
  path: string,
  options: Parameters<typeof measureProcess>[0],
): Promise<ProcessResult & { execution: Execution }> {
  const execution = await beginExecution(path);
  const result = await measureProcess(options);
  return completeExecution(path, execution, result);
}
