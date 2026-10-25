import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { preflightUniqueInference } from "../local-inference-unique/domain/preflight.js";

// Pass a validated snapshot over stdin; never reopen inputs in the renderer.
try {
  const args = process.argv.slice(2);
  const separator = args.indexOf("--");
  if (separator < 1 || separator === args.length - 1)
    throw new Error("INVALID-ARGUMENTS");
  const saved: unknown[] = await Promise.all(
    args
      .slice(0, separator)
      .map(async (path) => JSON.parse(await readFile(path, "utf8"))),
  );
  preflightUniqueInference(saved);
  const rendered = spawnSync(args[separator + 1], args.slice(separator + 2), {
    input: JSON.stringify(saved),
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (rendered.error || rendered.signal) throw new Error("RENDER-FAILED");
  process.exitCode = rendered.status ?? 1;
} catch (error) {
  const reason = error instanceof Error ? error.message : "";
  console.error(
    ["DUPLICATE-INFERENCE-ROW", "INVALID-INFERENCE-IDENTITY"].includes(reason)
      ? reason
      : "INFERENCE-PREFLIGHT-FAILED",
  );
  process.exitCode = 1;
}
