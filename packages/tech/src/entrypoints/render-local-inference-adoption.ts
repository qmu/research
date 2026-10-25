import { readFile, writeFile } from "node:fs/promises";
import { renderAdoptionReport } from "../local-inference-adoption/domain/adoption.js";

const [output, ...inputs] = process.argv.slice(2);
if (!output || inputs.length === 0) {
  console.error(
    "Usage: local-inference:adoption <new-report.md> <result.json> [...]",
  );
  process.exitCode = 1;
} else {
  try {
    const results = await Promise.all(
      inputs.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
    );
    const report = renderAdoptionReport(results);
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
