import { readFile, writeFile } from "node:fs/promises";
import {
  createAdoptionRow,
  type AdoptionDecision,
  type AdoptionRow,
} from "../../strata-adoption/domain/adoption-row.js";

/** Save a new artifact; an existing file is never overwritten. */
export async function saveAdoptionRow(
  path: string,
  decision: AdoptionDecision,
  provenance: unknown,
): Promise<AdoptionRow> {
  const row = createAdoptionRow(decision, provenance);
  await writeFile(path, `${JSON.stringify(row, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return row;
}

/** Revalidate saved provenance, including rows from incomplete older artifacts. */
export async function loadAdoptionRow(path: string): Promise<AdoptionRow> {
  const input: unknown = JSON.parse(await readFile(path, "utf8"));
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("Invalid adoption row");
  }
  const record = input as Record<string, unknown>;
  if (
    record.decision !== "adopt" &&
    record.decision !== "reject" &&
    record.decision !== "undetermined"
  ) {
    throw new Error("Invalid adoption decision");
  }
  return createAdoptionRow(record.decision, record.provenance);
}
