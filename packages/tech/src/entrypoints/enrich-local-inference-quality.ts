import { readFile, writeFile } from "node:fs/promises";
import { enrichQuality } from "../local-inference-quality/domain/quality.js";

try {
  const args = process.argv.slice(2);
  if (args.length !== 4)
    throw new Error(
      "Usage: node --import tsx/esm src/entrypoints/enrich-local-inference-quality.ts result.json fixtures.json evidence.json new-result.json",
    );
  const [source, fixtures, evidence] = await Promise.all(
    args.slice(0, 3).map((path) => readFile(path, "utf8")),
  );
  const result = enrichQuality(
    source,
    JSON.parse(fixtures),
    JSON.parse(evidence),
  );
  await writeFile(args[3], JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  console.log("Saved per-fixture quality judgments (exact-text/v1).");
} catch {
  // Do not print input paths, generated text, expected answers or parser errors.
  console.error(
    "Quality enrichment failed: check arguments, schema, source digest and output path. Existing files are never overwritten.",
  );
  process.exitCode = 1;
}
