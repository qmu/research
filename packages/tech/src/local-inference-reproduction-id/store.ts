// Saves only the five reproduction conditions and the id they determine;
// publishes a complete JSON file atomically. Repeated or concurrent saves
// of the same conditions publish identical bytes under the same filename.
// This identifies a reproduction configuration, not an individual
// measurement attempt.

import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  normalizeReproductionConditions,
  reproductionId,
  type ReproductionConditions,
} from "./domain/identity";

export const saveReproductionId = async (
  directory: string,
  input: ReproductionConditions,
): Promise<{ reproductionId: string; path: string }> => {
  const conditions = normalizeReproductionConditions(input);
  const id = reproductionId(conditions);
  const record = { ...conditions, reproductionId: id };

  await mkdir(directory, { recursive: true });
  const temporary = await mkdtemp(
    join(directory, ".local-inference-reproduction-id-"),
  );
  const path = join(directory, `${id}.json`);
  try {
    const source = join(temporary, "record.json");
    await writeFile(source, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    await rename(source, path);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  return { reproductionId: id, path };
};
