import { readFileSync } from "node:fs";
import { parseInferenceReport } from "./domain/validation";

/** Shared preflight for validation and rendering; never opens an output file. */
export function readInferenceReport(path: string) {
  return parseInferenceReport(JSON.parse(readFileSync(path, "utf8")));
}
