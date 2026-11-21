import type { LatencyMemoryReading, LatencyMemoryRun } from "./types.js";

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const parseReading = (value: unknown, at: string): LatencyMemoryReading => {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${at}.reading must be an object`);
  }
  const reading = value as Record<string, unknown>;
  if (reading.status === "verified") {
    if (
      !isFiniteNumber(reading.initialDelayMs) ||
      !isFiniteNumber(reading.peakRssMiB)
    ) {
      throw new Error(
        `${at}.reading is "verified" but initialDelayMs/peakRssMiB is not a finite number`,
      );
    }
    return {
      status: "verified",
      initialDelayMs: reading.initialDelayMs,
      peakRssMiB: reading.peakRssMiB,
    };
  }
  if (reading.status === "unverified") {
    if (typeof reading.reason !== "string" || reading.reason === "") {
      throw new Error(`${at}.reading is "unverified" but reason is missing`);
    }
    return { status: "unverified", reason: reading.reason };
  }
  throw new Error(`${at}.reading.status must be "verified" or "unverified"`);
};

const parseRun = (value: unknown, index: number): LatencyMemoryRun => {
  const at = `runs[${index}]`;
  if (typeof value !== "object" || value === null) {
    throw new Error(`${at} must be an object`);
  }
  const run = value as Record<string, unknown>;
  if (typeof run.engine !== "string" || run.engine === "") {
    throw new Error(`${at}.engine must be a non-empty string`);
  }
  if (typeof run.label !== "string" || run.label === "") {
    throw new Error(`${at}.label must be a non-empty string`);
  }
  return {
    engine: run.engine,
    label: run.label,
    reading: parseReading(run.reading, at),
  };
};

/**
 * Parses an untrusted document (parsed JSON, shaped as `{ runs: [...] }`)
 * into typed `LatencyMemoryRun`s, rejecting anything that does not match
 * `LatencyMemoryReading`'s discriminated shape. Throws, rather than
 * dropping or defaulting, on a malformed entry — a silently skipped run
 * would misreport `verifiedCount`/`excludedCount` downstream.
 */
export const parseLatencyMemoryRuns = (
  document: unknown,
): LatencyMemoryRun[] => {
  if (typeof document !== "object" || document === null) {
    throw new Error("document must be an object");
  }
  const runs = (document as Record<string, unknown>).runs;
  if (!Array.isArray(runs)) {
    throw new Error("document.runs must be an array");
  }
  return runs.map((run, index) => parseRun(run, index));
};
