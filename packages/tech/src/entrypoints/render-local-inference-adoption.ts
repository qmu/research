import { readFile, writeFile } from "node:fs/promises";
import { renderAdoptionReport } from "../local-inference-adoption/domain/adoption.js";

const args = process.argv.slice(2);
const [flag, currentCommit] = args.splice(0, 2);
// Optional for legacy reports; without selection no TTFT value is adopted.
const selected = args[0] === "--run-id";
const runId = selected ? args[1] : undefined;
const runnerFlag = selected ? args[2] : undefined;
const runnerVersion = selected ? args[3] : undefined;
if (selected) args.splice(0, 4);
const [output, ...inputs] = args;
if (
  flag !== "--commit" ||
  !currentCommit ||
  !output ||
  inputs.length === 0 ||
  (selected && (!runId || runnerFlag !== "--runner-version" || !runnerVersion))
) {
  console.error(
    "Usage: local-inference:adoption --commit <full-sha> [--run-id <id> --runner-version <version>] <new-report.md> <result.json> [...]",
  );
  process.exitCode = 1;
} else {
  try {
    const results = await Promise.all(
      inputs.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
    );
    const report = renderAdoptionReport(
      results,
      currentCommit,
      selected
        ? {
            runId: runId ?? "",
            runnerVersion: runnerVersion ?? "",
            targetCommit: currentCommit,
          }
        : undefined,
    );
    await writeFile(output, report, { flag: "wx" });
    console.log("Wrote condition-scoped adoption report.");
  } catch {
    // Parser/OS diagnostics may contain paths or private input contents.
    console.error(
      "Could not render report: check inputs and use a new output file.",
    );
    process.exitCode = 1;
  }
}
