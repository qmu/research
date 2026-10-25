import { readFileSync, writeFileSync } from "node:fs";
import { renderInferenceReport } from "../local-inference/domain/report";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error(
    "Usage: npm run local-inference:render -- input.json [output.md]",
  );
}
// Validate and render completely before opening the output file.
const report = renderInferenceReport(JSON.parse(readFileSync(input, "utf8")));
if (output) writeFileSync(output, report);
else process.stdout.write(report);
