import { randomUUID } from "node:crypto";
import { open, writeFile } from "node:fs/promises";
import { type PeakRss } from "./domain/peak-rss.js";
import {
  execute,
  SAMPLE_INTERVAL_MS,
  SNAPSHOT_TIMEOUT_MS,
} from "./vendors/process.js";

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
    let sampleCount = 0;
    if (!supported) {
      peakRss = { value: null, unit: "MiB", reason: "NOT-RUN" };
      acquisitionReason = "UNSUPPORTED-HOST";
    } else {
      try {
        const result = await dependencies.execute(
          config.command[0],
          config.command.slice(1),
          timeoutMs,
        );
        sampleCount = result.sampleCount;
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
          acquisitionReason = result.timedOut
            ? "TIMEOUT"
            : !["RECORDED", "NO-FIELD"].includes(result.acquisitionReason)
              ? result.acquisitionReason
              : "PROCESS-FAILED";
        } else {
          peakRss = result.peakRss;
          acquisitionReason = result.acquisitionReason;
          if (peakRss.value === null) status = "failed";
        }
      } catch {
        status = "failed";
        peakRss = { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
        acquisitionReason = "PROCESS-FAILED";
      }
    }
    const result = {
      schemaVersion: 2,
      runId: randomUUID(),
      engine: config.engine,
      status,
      exitCode,
      signal,
      metrics: { peak_rss: peakRss },
      memoryMeasurement: {
        method: "ps-sampled-simultaneous-rss",
        scope: "local-inference-process-tree",
        aggregation: "maximum-sampled-sum",
        sampleIntervalMs: SAMPLE_INTERVAL_MS,
        snapshotTimeoutMs: SNAPSHOT_TIMEOUT_MS,
        sampleCount,
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
