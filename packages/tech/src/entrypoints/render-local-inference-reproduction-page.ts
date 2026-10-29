// Thin CLI: read a saved adoption row file, validate it, and write the
// rendered local-inference adoption page. No network calls, no model
// execution — this only renders an artifact that already exists on disk.

import { readFile, writeFile } from "node:fs/promises";
import { isDirectRun } from "./direct-run";
import { renderAdoptionPage } from "../local-inference-reproduction-id/domain/adoption-page";
import { parseAdoptionRowFile } from "../local-inference-reproduction-id/domain/adoption-row";

export const main = async (): Promise<void> => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (inputPath === undefined || outputPath === undefined) {
    throw new Error(
      "usage: render-local-inference-reproduction-page <input.json> <output.md>",
    );
  }

  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const rows = parseAdoptionRowFile(raw);
  await writeFile(outputPath, renderAdoptionPage(rows), "utf8");

  process.stdout.write(
    `local-inference reproduction page: ${rows.length} row(s)\n` +
      `wrote ${outputPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `local-inference reproduction page render failed: ${String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
