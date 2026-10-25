import { readFile } from "node:fs/promises";
import { verifyRemeasurementSnapshot } from "../local-inference-adoption/domain/remeasurement.js";

const [runId, targetCommit, runnerVersion, input, ...extra] =
  process.argv.slice(2);
try {
  if (!runId || !targetCommit || !runnerVersion || !input || extra.length)
    throw new Error("Invalid arguments");
  const snapshot: unknown = JSON.parse(await readFile(input, "utf8"));
  const source = verifyRemeasurementSnapshot(snapshot, {
    runId,
    targetCommit,
    runnerVersion,
  });
  // Output only the allowlisted binding. Never persist or relabel the original.
  console.log(
    JSON.stringify({ source, requiresNewExecutionId: true }, null, 2),
  );
} catch {
  console.error(
    "Remeasurement blocked: snapshot identity is missing, invalid or changed.",
  );
  process.exitCode = 1;
}
