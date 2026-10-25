// Thin CLI: read a common local-inference JSON record, validate it, and
// write the rendered comparison page. No network calls, no model execution —
// this only renders an artifact that already exists on disk.

import { readFile, writeFile } from "node:fs/promises";
import { isDirectRun } from "./direct-run";
import { parseComparisonFile } from "../local-inference/domain/record";
import { renderComparisonPage } from "../local-inference/domain/report";

export const main = async (): Promise<void> => {
  const [inputPath, outputPath] = process.argv.slice(2);
  if (inputPath === undefined || outputPath === undefined) {
    throw new Error(
      "usage: render-local-inference <input.json> <output.md>",
    );
  }

  const raw = JSON.parse(await readFile(inputPath, "utf8"));
  const file = parseComparisonFile(raw);
  await writeFile(outputPath, renderComparisonPage(file), "utf8");

  process.stdout.write(
    `local-inference: ${file.runs.length} run(s), fixture=${file.fixture}\n` +
      `wrote ${outputPath}\n`,
  );
};

if (isDirectRun(import.meta.url)) {
  main().catch((error: unknown) => {
    process.stderr.write(`local inference render failed: ${String(error)}\n`);
    process.exitCode = 1;
  });
}
