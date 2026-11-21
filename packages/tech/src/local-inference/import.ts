import { readFile, writeFile } from "node:fs/promises";
import { withRecordedStrataTtft } from "./domain/recorded-ttft.js";

/** Exclusive creation keeps the original evidence and prior exports intact. */
export async function saveRecordedStrataTtft(
  inputPath: string,
  recordPath: string,
  outputPath: string,
  runIndex: number,
) {
  const input: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const record: unknown = JSON.parse(await readFile(recordPath, "utf8"));
  const result = withRecordedStrataTtft(input, record, runIndex);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", {
    flag: "wx",
  });
  return result;
}
