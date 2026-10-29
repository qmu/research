import { readFile } from "node:fs/promises";
import { saveReproductionRun } from "../reproduction-run/store";
import { isDirectRun } from "./direct-run";

export const main = async (args = process.argv.slice(2)): Promise<void> => {
  const [input, output] = args;
  if (!input || !output || args.length !== 2) {
    throw new Error(
      "Usage: save-reproduction-run <conditions.json> <output-dir>",
    );
  }
  const conditions = JSON.parse(await readFile(input, "utf8"));
  if (conditions === null || typeof conditions !== "object") {
    throw new Error("Expected reproduction conditions object");
  }
  const saved = await saveReproductionRun(output, conditions);
  process.stdout.write(`${JSON.stringify(saved)}\n`);
};

if (isDirectRun(import.meta.url)) {
  main().catch(() => {
    // Do not echo input contents, paths or untrusted parsing errors.
    process.stderr.write(
      "Unable to save reproduction run; check conditions and output directory.\n",
    );
    process.exitCode = 1;
  });
}
