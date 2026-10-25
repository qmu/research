import { writeFileSync } from "node:fs";
import { readInferenceReport } from "../local-inference/read-report";
import { renderInferenceReport } from "../local-inference/domain/report";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error(
    "Usage: npm run local-inference:render -- input.json [output.md]",
  );
}
// Validate and render completely before opening the output file.
const report = renderInferenceReport(readInferenceReport(input));
if (output) writeFileSync(output, report);
else process.stdout.write(report);
