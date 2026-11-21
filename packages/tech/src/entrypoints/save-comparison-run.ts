import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { saveComparisonRun } from "../comparison-run/store";

/** Input: { conditions: { engine, model, fixture, runnerVersion, targetCommit },
 * command: [executable, ...args], measurements: { ... } }. Never executes argv.
 */
export const main = async (args: string[]): Promise<void> => {
  if (args.length !== 2)
    throw new Error(
      "Usage: save-comparison-run <input.json> <output-directory>",
    );
  const input = JSON.parse(await readFile(args[0], "utf8"));
  const path = await saveComparisonRun(
    args[1],
    input.conditions,
    input.command,
    input.measurements,
  );
  console.log(path);
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main(process.argv.slice(2)).catch(() => {
    console.error(
      "Comparison run save failed; check input and output directory",
    );
    process.exitCode = 1;
  });
}
