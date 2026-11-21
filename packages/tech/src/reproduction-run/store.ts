import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  reproductionIdentity,
  type ReproductionConditions,
} from "./domain/identity";

/** Save only the five identity conditions; publish complete JSON atomically.
 * Repeated/concurrent saves of the same conditions publish identical bytes.
 * This identifies reproduction conditions, not individual measurement attempts.
 */
export const saveReproductionRun = async (
  directory: string,
  input: ReproductionConditions,
): Promise<{ runId: string; path: string }> => {
  const record = reproductionIdentity(input);
  await mkdir(directory, { recursive: true });
  const temporary = await mkdtemp(join(directory, ".reproduction-"));
  const path = join(directory, `${record.runId}.json`);
  try {
    const source = join(temporary, "record.json");
    await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await rename(source, path);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return { runId: record.runId, path };
};
