import { readFile, writeFile } from "node:fs/promises";
import { renderAdoptionReport } from "../local-inference-adoption/domain/adoption.js";

const [flag, currentCommit, output, ...inputs] = process.argv.slice(2);
if (flag !== "--commit" || !currentCommit || !output || inputs.length === 0) {
  console.error(
    "Usage: local-inference:adoption --commit <full-sha> <new-report.md> <result.json> [...]",
  );
  process.exitCode = 1;
} else {
  try {
    const results = await Promise.all(
      inputs.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
    );
    const report = renderAdoptionReport(results, currentCommit);
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
