import { readFile } from "node:fs/promises";
import {
  remeasurementContext,
  verifyRemeasurementSnapshot,
} from "../local-inference-adoption/domain/remeasurement.js";
import { snapshotRecoveryRequest } from "../local-inference-adoption/domain/recovery-request.js";

const args = process.argv.slice(2);
const recover = args[0] === "--request-on-failure";
if (recover) args.shift();
const [runId, targetCommit, runnerVersion, input, ...extra] = args;
try {
  if (!runId || !targetCommit || !runnerVersion || !input || extra.length)
    throw new Error("Invalid arguments");
  const expected = remeasurementContext({
    runId,
    targetCommit,
    runnerVersion,
  });
  if (!expected) throw new Error("Invalid context");
  // Classify only snapshot acquisition. Never turn unrelated failures into requests.
  let reason = "SNAPSHOT-READ-FAILED";
  let source;
  try {
    const text = await readFile(input, "utf8");
    reason = "SNAPSHOT-JSON-INVALID";
    const snapshot: unknown = JSON.parse(text);
    reason = "SNAPSHOT-IDENTITY-MISMATCH";
    source = verifyRemeasurementSnapshot(snapshot, expected);
  } catch {
    if (!recover) throw new Error("Snapshot blocked");
    console.log(
      JSON.stringify(snapshotRecoveryRequest(expected, reason), null, 2),
    );
    process.exitCode = 2;
  }
  // Output only the allowlisted binding. Never persist or relabel the original.
  if (source)
    console.log(
      JSON.stringify({ source, requiresNewExecutionId: true }, null, 2),
    );
} catch {
  console.error(
    "Remeasurement blocked: snapshot identity is missing, invalid or changed.",
  );
  process.exitCode = 1;
}
