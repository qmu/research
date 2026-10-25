import { saveRecordedStrataTtft } from "../local-inference/import.js";

const [input, record, output, index, ...extra] = process.argv.slice(2);
if (!input || !record || !output || index === undefined || extra.length) {
  throw new Error(
    "Usage: import-strata-ttft <inference.json> <record.json> <output.json> <run-index>",
  );
}
await saveRecordedStrataTtft(input, record, output, Number(index));
