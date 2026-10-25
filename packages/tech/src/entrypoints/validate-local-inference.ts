import { readInferenceReport } from "../local-inference/read-report";

const [input, ...extra] = process.argv.slice(2);
if (!input || extra.length) {
  throw new Error("Usage: npm run local-inference:validate -- input.json");
}
readInferenceReport(input);
