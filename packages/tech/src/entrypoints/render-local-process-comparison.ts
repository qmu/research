import { readFile } from "node:fs/promises";
import { renderProcessComparison } from "../local-inference/domain/process-comparison.js";

// Input is one saved #223 JSON file per engine. No process is launched here.
try {
  const paths = process.argv.slice(2);
  const values: unknown[] = await Promise.all(
    paths.map(
      async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
    ),
  );
  process.stdout.write(renderProcessComparison(values));
} catch {
  console.error(
    "Cannot render comparison: unreadable, invalid or duplicate process evidence.",
  );
  process.exitCode = 1;
}
