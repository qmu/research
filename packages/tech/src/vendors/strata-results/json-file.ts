import { readFile, writeFile } from "node:fs/promises";
import {
  buildStrataResult,
  type StrataResult,
} from "../../strata-results/domain/result.js";

/** New artifacts only; never overwrite a previous execution. */
export async function saveStrataResult(
  path: string,
  execution: unknown,
): Promise<StrataResult> {
  const result = buildStrataResult(execution);
  await writeFile(path, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  return result;
}

/** Recompute derived headroom and adoption rather than trusting stored fields. */
export async function loadStrataResult(path: string): Promise<StrataResult> {
  const raw: unknown = JSON.parse(await readFile(path, "utf8"));
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("schemaVersion" in raw) ||
    raw.schemaVersion !== 1 ||
    !("engine" in raw) ||
    raw.engine !== "strata"
  ) {
    throw new Error("Unsupported Strata result artifact");
  }
  return buildStrataResult(raw);
}
