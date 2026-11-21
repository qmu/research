import { randomUUID } from "node:crypto";
import { mkdir, open, readdir, readFile, rename, rm } from "node:fs/promises";
import { join } from "node:path";
import type { ReproductionConditions } from "../reproduction-run/domain/identity";
import {
  comparisonRecord,
  parseComparisonRecord,
  type ComparisonRecord,
  type Measurements,
} from "./domain/record";

/** One atomic publication point for conditions, command and measured results.
 * Repeated configurations replace the previous complete result; temporary files
 * never have a final .json name. A failed replacement preserves the old record.
 */
export const saveComparisonRun = async (
  directory: string,
  conditions: ReproductionConditions,
  command: readonly string[],
  measurements: Measurements,
): Promise<string> => {
  const record = comparisonRecord(conditions, command, measurements);
  const bytes = `${JSON.stringify(record, null, 2)}\n`;
  await mkdir(directory, { recursive: true });
  const destination = join(directory, `${record.manifest.runId}.json`);
  const temporary = join(
    directory,
    `.${record.manifest.runId}.${randomUUID()}.tmp`,
  );
  try {
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(bytes, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    await rename(temporary, destination);
    const parent = await open(directory, "r");
    try {
      await parent.sync();
    } finally {
      await parent.close();
    }
    return destination;
  } finally {
    await rm(temporary, { force: true });
  }
};

/** Admission gate for adoption calculations. Only committed, validated pairs
 * are returned; no caller should calculate adoption from raw directory JSON.
 * Missing directories and real I/O failures remain errors, not empty success.
 */
export const loadAdoptionRuns = async (
  directory: string,
): Promise<ComparisonRecord[]> => {
  const records: ComparisonRecord[] = [];
  for (const name of (await readdir(directory)).sort()) {
    if (!/^repro-v1-[a-f0-9]{64}\.json$/.test(name)) continue;
    let value: unknown;
    try {
      value = JSON.parse(await readFile(join(directory, name), "utf8"));
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        (error as NodeJS.ErrnoException).code === "ENOENT"
      )
        continue;
      throw error;
    }
    const record = parseComparisonRecord(value);
    if (record && name === `${record.manifest.runId}.json`)
      records.push(record);
  }
  return records;
};
