import { readFile } from "node:fs/promises";
import { diffQuality } from "../local-inference-quality-diff/domain/diff.js";

try {
  const args = process.argv.slice(2);
  if (args.length !== 2) throw new Error("Invalid arguments");
  const [before, after] = await Promise.all(
    args.map(
      async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
    ),
  );
  process.stdout.write(
    JSON.stringify(diffQuality(before, after), null, 2) + "\n",
  );
} catch {
  // Neither input values, paths, nor parser errors may expose evidence text.
  process.stderr.write(
    "Quality diff failed: provide two valid common inference JSON files.\n",
  );
  process.exitCode = 1;
}
