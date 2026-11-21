import { readFileSync, writeFileSync } from "node:fs";
import { renderComparisonMarkdown } from "../local-inference/domain/comparison";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error(
    "Usage: npm run local-inference:gaps -- input.json [output.md]",
  );
}
// Validate and render completely before opening the output file.
const page = renderComparisonMarkdown(JSON.parse(readFileSync(input, "utf8")));
if (output) writeFileSync(output, page);
else process.stdout.write(page);
