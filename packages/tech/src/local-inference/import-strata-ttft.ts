import { readFile, writeFile } from "node:fs/promises";
import { normalizeStrataTtft } from "./vendors/strata-ttft.js";

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a JSON object");
  }
  return value as Record<string, unknown>;
}

/** Update only the explicitly selected Strata run, retaining trial provenance. */
export function attachStrataTtft(
  input: unknown,
  record: unknown,
  runIndex: number,
) {
  const result = object(input);
  if (result.schemaVersion !== 1 || !Array.isArray(result.runs)) {
    throw new Error("Expected common inference JSON schemaVersion 1 with runs");
  }
  if (
    !Number.isInteger(runIndex) ||
    runIndex < 0 ||
    runIndex >= result.runs.length
  ) {
    throw new Error("Select an existing run index");
  }
  const run = object(result.runs[runIndex]);
  if (run.engine !== "strata") {
    throw new Error("Selected run must use the strata engine");
  }
  const metrics = object(run.metrics);
  return {
    ...result,
    runs: result.runs.map((entry: unknown, index: number) =>
      index === runIndex
        ? {
            ...run,
            metrics: { ...metrics, ttft: normalizeStrataTtft(record) },
          }
        : entry,
    ),
  };
}

/** Save a new artifact; never overwrite the source or an earlier measurement. */
export async function importStrataTtft(
  inputPath: string,
  recordPath: string,
  outputPath: string,
  runIndex: number,
) {
  const input: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const record: unknown = JSON.parse(await readFile(recordPath, "utf8"));
  const result = attachStrataTtft(input, record, runIndex);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}
