import type { FixedCapacityTier } from "../../local-inference-memory-margin/domain/types.js";
import {
  engines,
  runPurposes,
  type Engine,
  type RunPurpose,
} from "./result.js";

export type RemeasurementBinding = {
  execution: { runId: string; version: number };
  targetCommit: string;
  runnerVersion: string;
  fixtureSha256: string;
  fixedTier: FixedCapacityTier;
};

export type RemeasurementRequest = {
  requestId: string;
  binding: RemeasurementBinding;
  targets: {
    runId: string;
    engine: Engine;
    missingMetrics: ("ttft" | "peak_rss")[];
  }[];
};

export type RecoverableResult = {
  execution: RemeasurementBinding["execution"] & {
    targetCommit: string;
    runnerVersion: string;
  };
  fixtureSha256?: string;
  fixedTier?: FixedCapacityTier;
  runs: {
    runId: string;
    engine: Engine;
    targetCommit: string;
    runnerVersion: string;
    purpose: RunPurpose;
    metrics: {
      ttft: { value: number | null };
      peak_rss: { value: number | null };
    };
  }[];
  remeasurementRequest?: RemeasurementRequest | null;
};

export function validFixedTier(tier: unknown): tier is FixedCapacityTier {
  if (!tier || typeof tier !== "object") return false;
  const candidate = tier as FixedCapacityTier;
  return (
    typeof candidate.label === "string" &&
    candidate.label.trim().length > 0 &&
    Number.isSafeInteger(candidate.totalMiB) &&
    candidate.totalMiB > 0
  );
}

/** Produce one request for every missing TTFT/RSS field in this batch.
 * Never combine measurements from different requests, nor infer missing = 0.
 */
export function remeasurementRequest(
  result: RecoverableResult,
  binding: RemeasurementBinding,
  requestId: string,
): RemeasurementRequest | null {
  if (
    !result ||
    !result.execution ||
    !Array.isArray(result.runs) ||
    !binding ||
    !binding.execution ||
    typeof requestId !== "string" ||
    !requestId ||
    !validFixedTier(binding.fixedTier) ||
    !validFixedTier(result.fixedTier) ||
    typeof binding.targetCommit !== "string" ||
    !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(binding.targetCommit) ||
    typeof binding.runnerVersion !== "string" ||
    !binding.runnerVersion ||
    typeof binding.fixtureSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(binding.fixtureSha256) ||
    typeof binding.execution.runId !== "string" ||
    !binding.execution.runId ||
    !Number.isSafeInteger(binding.execution.version) ||
    binding.execution.version < 1 ||
    result.execution.runId !== binding.execution.runId ||
    result.execution.version !== binding.execution.version ||
    result.execution.targetCommit !== binding.targetCommit ||
    result.execution.runnerVersion !== binding.runnerVersion ||
    result.fixtureSha256 !== binding.fixtureSha256 ||
    result.fixedTier.label !== binding.fixedTier.label ||
    result.fixedTier.totalMiB !== binding.fixedTier.totalMiB
  )
    throw new Error("REMEASUREMENT-BINDING-MISMATCH");
  const targets: RemeasurementRequest["targets"] = [];
  const runIds = new Set<string>();
  for (const row of result.runs) {
    if (
      !row ||
      typeof row.runId !== "string" ||
      !row.runId ||
      runIds.has(row.runId) ||
      !engines.includes(row.engine) ||
      row.targetCommit !== binding.targetCommit ||
      row.runnerVersion !== binding.runnerVersion ||
      !runPurposes.includes(row.purpose)
    )
      throw new Error("REMEASUREMENT-BINDING-MISMATCH");
    runIds.add(row.runId);
    // Warm-up rows are provenance-checked above like any other row, but never
    // contribute a remeasurement target: their speed/memory values must not
    // be read as evidence that an adoption-target measurement is missing.
    if (row.purpose === "warmup") continue;
    const missingMetrics: RemeasurementRequest["targets"][number]["missingMetrics"] =
      [];
    for (const metric of ["ttft", "peak_rss"] as const) {
      const value = row.metrics?.[metric]?.value;
      if (value === null) missingMetrics.push(metric);
      else if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0
      )
        throw new Error("INVALID-REMEASUREMENT-METRIC");
    }
    if (missingMetrics.length)
      targets.push({ runId: row.runId, engine: row.engine, missingMetrics });
  }
  if (!targets.length) return null;
  return {
    requestId,
    binding: {
      execution: {
        runId: binding.execution.runId,
        version: binding.execution.version,
      },
      targetCommit: binding.targetCommit,
      runnerVersion: binding.runnerVersion,
      fixtureSha256: binding.fixtureSha256,
      fixedTier: {
        label: binding.fixedTier.label,
        totalMiB: binding.fixedTier.totalMiB,
      },
    },
    targets,
  };
}
