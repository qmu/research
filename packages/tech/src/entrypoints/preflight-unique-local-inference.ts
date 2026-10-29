import { readFile } from "node:fs/promises";
import { preflightUniqueInference } from "../local-inference-unique/domain/preflight.js";

try {
  const paths = process.argv.slice(2);
  if (!paths.length || paths.some((path) => path.startsWith("-")))
    throw new Error("INVALID-INFERENCE-IDENTITY");
  const saved: unknown[] = await Promise.all(
    paths.map(
      async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
    ),
  );
  preflightUniqueInference(saved);
  process.stdout.write("UNIQUE-INFERENCE-ROWS\n");
} catch (error) {
  process.stderr.write(
    error instanceof Error && error.message === "DUPLICATE-INFERENCE-ROW"
      ? "DUPLICATE-INFERENCE-ROW\n"
      : "INVALID-INFERENCE-IDENTITY\n",
  );
  process.exitCode = 1;
}
