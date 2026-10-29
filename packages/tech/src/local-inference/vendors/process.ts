import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";

export type Engine = "strata" | "ollama" | "llama.cpp" | "mlx";
export type ProcessResult = {
  schema_version: 1;
  engine: Engine;
  status: "ok" | "failed";
  process: { exit_code: number | null; signal: NodeJS.Signals | null };
  failure: {
    code: "TIMEOUT" | "CANCELLED" | "UNREACHABLE" | "MEASURE-FAILED";
  } | null;
};

/** Run one measurement command. Commands, environment and diagnostics stay private. */
export async function measureProcess(options: {
  engine: Engine;
  command: string;
  args?: string[];
  timeoutMs: number;
  signal?: AbortSignal;
}): Promise<ProcessResult> {
  if (
    !Number.isFinite(options.timeoutMs) ||
    options.timeoutMs < 1 ||
    options.timeoutMs > 2_147_483_647
  )
    throw new Error("timeoutMs must be between 1 and 2147483647");
  const result = (
    exitCode: number | null,
    signal: NodeJS.Signals | null,
    code: NonNullable<ProcessResult["failure"]>["code"] | null,
  ): ProcessResult => ({
    schema_version: 1,
    engine: options.engine,
    status: code === null ? "ok" : "failed",
    process: { exit_code: exitCode, signal },
    failure: code === null ? null : { code },
  });
  if (options.signal?.aborted) return result(null, null, "CANCELLED");
  return new Promise((resolve) => {
    // No shell interpolation or captured output: neither secrets nor unbounded
    // model output can enter the artifact or fill a pipe.
    const child = spawn(options.command, options.args ?? [], {
      stdio: "ignore",
    });
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

/** Exclusive creation protects previous evidence; failure rows are saved too. */
export async function saveProcessMeasurement(
  path: string,
  options: Parameters<typeof measureProcess>[0],
): Promise<ProcessResult> {
  const result = await measureProcess(options);
  await writeFile(path, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  return result;
}
