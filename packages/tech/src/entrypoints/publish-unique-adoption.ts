import { readFileSync } from "node:fs";
import {
  DUPLICATE_ADOPTION_ROW,
  INVALID_ADOPTION_IDENTITY,
  publishUniqueAdoptionRows,
} from "../adoption-publication/domain/unique.js";

// stdout is the publication artifact: never emit a partial batch on rejection.
try {
  if (process.argv.length !== 3) throw new Error(INVALID_ADOPTION_IDENTITY);
  const rows: unknown = JSON.parse(readFileSync(process.argv[2], "utf8"));
  if (!Array.isArray(rows)) throw new Error(INVALID_ADOPTION_IDENTITY);
  publishUniqueAdoptionRows(rows, (validated) => {
    process.stdout.write(`${JSON.stringify(validated, null, 2)}\n`);
  });
} catch (error) {
  const reason =
    error instanceof Error && error.message === DUPLICATE_ADOPTION_ROW
      ? DUPLICATE_ADOPTION_ROW
      : INVALID_ADOPTION_IDENTITY;
  process.stderr.write(`${reason}\n`);
  process.exitCode = 1;
}
