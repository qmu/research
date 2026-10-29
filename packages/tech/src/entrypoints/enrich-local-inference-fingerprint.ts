import { readFile, writeFile } from "node:fs/promises";
import { enrichFingerprint } from "../local-inference-fingerprint/domain/fingerprint.js";
import { collectFingerprint } from "../local-inference-fingerprint/vendors/host.js";

try {
  const args = process.argv.slice(2);
  if (args.length !== 2)
    throw new Error(
      "Usage: node --import tsx/esm src/entrypoints/enrich-local-inference-fingerprint.ts result.json new-result.json",
    );
  const source = await readFile(args[0], "utf8");
  const result = enrichFingerprint(source, collectFingerprint());
  await writeFile(args[1], JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  console.log("Saved host fingerprint (os, arch, memory, engine version).");
} catch {
  // Do not print input paths or parser errors.
  console.error(
    "Fingerprint enrichment failed: check arguments, schema and output path. Existing files are never overwritten.",
  );
  process.exitCode = 1;
}
