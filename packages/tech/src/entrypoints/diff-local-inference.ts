import { readFile } from "node:fs/promises";
import {
  diffInference,
  stableJson,
} from "../local-inference-diff/domain/diff.js";

const args = process.argv.slice(2);
try {
  if (args.length !== 2 || args.some((arg) => arg.startsWith("-")))
    throw new Error("arguments");
  const inputs = await Promise.all(
    args.map(
      async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
    ),
  );
  process.stdout.write(stableJson(diffInference(inputs[0], inputs[1])));
} catch {
  // Do not leak paths, raw JSON, or parser errors from operator supplied files.
  process.stderr.write(
    "local-inference:diff: expected two valid schemaVersion 1 JSON files\n",
  );
  process.exitCode = 1;
}
