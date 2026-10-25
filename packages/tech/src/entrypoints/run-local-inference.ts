import { isStaleExecutionError } from "../local-inference/vendors/versioned-result.js";
import { readFile } from "node:fs/promises";
import { runLocalInference } from "../local-inference/run.js";

try {
  const [config, output, ...extra] = process.argv.slice(2);
  if (!config || !output || extra.length) throw new Error("arguments");
  const result = await runLocalInference(
    JSON.parse(await readFile(config, "utf8")),
    output,
  );
  console.log(
    JSON.stringify(
      {
        schemaVersion: result.schemaVersion,
        execution: result.execution,
        runs: result.runs.map((r) => ({ engine: r.engine, status: r.status })),
      },
      null,
      2,
    ),
  );
  if (result.runs.some((r) => r.status === "failed")) process.exitCode = 1;
} catch (error) {
  console.error(
    isStaleExecutionError(error)
      ? error.message
      : "Local inference failed. Usage: npm run local-inference -- config.json new-result.json (valid config and existing output directory required).",
  );
  process.exitCode = 1;
}
