/** Structurally compatible with the fixed-tier calculator's MemoryReading. */
export type PeakRss =
  | { value: number; unit: "MiB" }
  | {
      value: null;
      unit: "MiB";
      reason: "NOT-RUN" | "NO-FIELD" | "MEASURE-FAILED";
    };

/** Darwin time(1) reports maximum resident set size in bytes, unlike Linux. */
export function parseDarwinPeakRss(stderr: string): PeakRss {
  const lines = stderr
    .split(/\r?\n/)
    .filter((line) => line.includes("maximum resident set size"));
  if (lines.length === 0)
    return { value: null, unit: "MiB", reason: "NO-FIELD" };
  const match =
    lines.length === 1 &&
    /^\s*(\d+)\s+maximum resident set size\s*$/.exec(lines[0]);
  const bytes = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(bytes) || bytes <= 0)
    return { value: null, unit: "MiB", reason: "MEASURE-FAILED" };
  return { value: bytes / 1024 ** 2, unit: "MiB" };
}
