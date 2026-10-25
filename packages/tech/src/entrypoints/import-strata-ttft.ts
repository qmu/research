import { importStrataTtft } from "../local-inference/import-strata-ttft.js";

const [input, record, output, index] = process.argv.slice(2);
if (!input || !record || !output || index === undefined) {
  throw new Error(
    "Usage: import-strata-ttft <common.json> <record.json> <new.json> <run-index>",
  );
}
await importStrataTtft(input, record, output, Number(index));
