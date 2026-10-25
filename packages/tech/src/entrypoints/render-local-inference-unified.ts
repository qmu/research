import { readFileSync, writeFileSync } from "node:fs";
import { parseUnifiedResult } from "../local-inference-unified/domain/parse";
import { renderUnifiedMarkdown } from "../local-inference-unified/domain/report";

const [input, output, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error(
    "Usage: node --import tsx/esm src/entrypoints/render-local-inference-unified.ts input.json [output.md]",
  );
}
// Validate and render completely before opening the output file.
const page = renderUnifiedMarkdown(
  parseUnifiedResult(JSON.parse(readFileSync(input, "utf8"))),
);
if (output) writeFileSync(output, page);
else process.stdout.write(page);
