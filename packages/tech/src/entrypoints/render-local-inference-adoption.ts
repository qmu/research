// Thin CLI: read a saved comparison snapshot JSON file, validate it, and
// write the rendered 採否 (adoption) page. No network calls, no model
// execution — this only renders an artifact that already exists on disk.

import { readFile, writeFile } from "node:fs/promises";
import { isDirectRun } from "./direct-run";
import { renderAdoptionReport } from "../local-inference/domain/adoption-report";
import { parseComparisonSnapshotFile } from "../local-inference/domain/snapshot";

export const main = async (): Promise<void> => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (inputPath === undefined || outputPath === undefined) {
    throw new Error(
      "usage: render-local-inference-adoption <input.json> <output.md>",
    );
  }

  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const file = parseComparisonSnapshotFile(raw);
  await writeFile(outputPath, renderAdoptionReport(file), "utf8");

  process.stdout.write(
    `local-inference adoption: ${file.snapshots.length} snapshot(s)\n` +
      `wrote ${outputPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `local inference adoption render failed: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
