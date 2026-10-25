import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  createReproductionRecord,
  type ReproductionConditions,
  type ReproductionRecord,
} from "./domain/reproduction.js";

/**
 * Save immutable conditions under their content ID. Exclusive creation means
 * repeated or concurrent saves cannot overwrite a previously recorded identity.
 * Only the five allowlisted conditions are persisted, never caller metadata.
 */
export async function saveReproductionRecord(
  directory: string,
  conditions: ReproductionConditions,
): Promise<ReproductionRecord> {
  const record = createReproductionRecord(conditions);
  const contents = JSON.stringify(record, null, 2) + "\n";
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${record.reproductionId}.json`);
  try {
    await writeFile(path, contents, { flag: "wx" });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    // Refuse a corrupt/mismatched existing record rather than silently repair it.
    if ((await readFile(path, "utf8")) !== contents) {
      throw new Error("Existing reproduction record does not match conditions");
    }
  }
  return record;
}
