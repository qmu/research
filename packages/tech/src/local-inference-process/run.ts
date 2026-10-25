import { open, writeFile } from "node:fs/promises";
import { parseDarwinPeakRss, type PeakRss } from "./domain/peak-rss.js";
import { execute } from "./vendors/process.js";

const engines = ["ollama", "llama.cpp", "mlx", "strata"] as const;
export type ProcessRun = {
  engine: (typeof engines)[number];
  command: string[];
  timeoutMs?: number;
};

type Dependencies = {
  platform: string;
  arch: string;
  execute: typeof execute;
};

/** One local, one-shot inference process per artifact; never a remote client. */
export async function runLocalInferenceProcess(
  config: ProcessRun,
  output: string,
  dependencies: Dependencies = {
    platform: process.platform,
    arch: process.arch,
    execute,
  },
) {
  const timeoutMs = config.timeoutMs ?? 60_000;
  if (
    !engines.includes(config.engine) ||
    !Array.isArray(config.command) ||
    config.command.length === 0 ||
    !config.command.every(
      (arg) => typeof arg === "string" && !arg.includes("\0"),
    ) ||
    !config.command[0] ||
    !Number.isSafeInteger(timeoutMs) ||
    timeoutMs <= 0 ||
    timeoutMs > 2_147_483_647
  )
    throw new Error("Invalid local inference process configuration");

  // Reserve before executing so a duplicate output path cannot trigger another run.
  const handle = await open(output, "wx", 0o600);
  try {
    const supported =
      dependencies.platform === "darwin" && dependencies.arch === "arm64";
    let peakRss: PeakRss;
    let acquisitionReason: string;
    let status: "measured" | "failed" | "not-run" = "not-run";
    let exitCode: number | null = null;
    let signal: string | null = null;
    if (!supported) {
      peakRss = { value: null, unit: "MiB", reason: "NOT-RUN" };
      acquisitionReason = "UNSUPPORTED-HOST";
    } else {
      try {
        const result = await dependencies.execute(
          "/usr/bin/time",
          // The shell only redirects engine stderr, then execs the exact argv.
          // time's own stderr remains separate from model output/diagnostics.
          [
            "-l",
            "/bin/sh",
            "-c",
            'exec "$@" 2>/dev/null',
            "inference",
            ...config.command,
          ],
          timeoutMs,
        );
        exitCode = result.exitCode;
        signal = result.signal;
        status =
          result.exitCode === 0 && !result.failed && !result.timedOut && !signal
            ? "measured"
            : "failed";
        if (
          result.failed ||
          result.timedOut ||
          signal ||
          result.exitCode !== 0
        ) {
          peakRss = { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
          acquisitionReason = result.timedOut ? "TIMEOUT" : "PROCESS-FAILED";
        } else {
          peakRss = parseDarwinPeakRss(result.stderr);
          acquisitionReason =
            peakRss.value !== null ? "RECORDED" : peakRss.reason;
        }
      } catch {
        status = "failed";
        peakRss = { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
        acquisitionReason = "PROCESS-FAILED";
      }
    }
    const result = {
      schemaVersion: 1,
      engine: config.engine,
      status,
      exitCode,
      signal,
      metrics: { peak_rss: peakRss },
      memoryMeasurement: {
        method: "darwin-time-l",
        scope: "local-inference-process",
        acquisitionReason,
      },
    };
    // No argv, environment, model output or raw diagnostics in saved JSON.
    await writeFile(handle, JSON.stringify(result, null, 2) + "\n");
    await handle.sync();
    return result;
  } finally {
    await handle.close();
  }
}
