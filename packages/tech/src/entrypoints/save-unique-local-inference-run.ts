import { readFileSync } from "node:fs";
import {
  DUPLICATE_SAVE_ROW,
  INVALID_SAVE_IDENTITY,
  saveUniqueRunRows,
} from "../local-inference-save-guard/domain/guard.js";

// stdout is the save artifact: never emit a partial batch on rejection.
try {
  if (process.argv.length !== 3) throw new Error(INVALID_SAVE_IDENTITY);
  const rows: unknown = JSON.parse(readFileSync(process.argv[2], "utf8"));
  if (!Array.isArray(rows)) throw new Error(INVALID_SAVE_IDENTITY);
  saveUniqueRunRows(rows, (validated) => {
    process.stdout.write(`${JSON.stringify(validated, null, 2)}\n`);
  });
} catch (error) {
  const reason =
    error instanceof Error && error.message === DUPLICATE_SAVE_ROW
      ? DUPLICATE_SAVE_ROW
      : INVALID_SAVE_IDENTITY;
  process.stderr.write(`${reason}\n`);
  process.exitCode = 1;
}
