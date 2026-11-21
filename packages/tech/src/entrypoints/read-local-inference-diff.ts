import { readFile } from "node:fs/promises";
import { readComparisonDiff } from "../local-inference-diff-reader/domain/read";

try {
  const [input, ...extra] = process.argv.slice(2);
  if (!input || extra.length) throw new Error("arguments");
  const result = readComparisonDiff(JSON.parse(await readFile(input, "utf8")));
  // Finish the complete read before emitting anything. Never modify input files.
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // Valid but ineligible rows are machine-readable failures, not successful imports.
  if (result.runs.some((row) => row.runnerFailure !== null))
    process.exitCode = 2;
} catch {
  // Paths, parser excerpts and untrusted runner strings are not diagnostics.
  process.stderr.write("INVALID-COMPARISON-JSON\n");
  process.exitCode = 1;
}
