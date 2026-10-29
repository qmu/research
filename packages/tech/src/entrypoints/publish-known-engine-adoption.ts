import { readFile } from "node:fs/promises";
import { publishKnownEngineRows } from "../adoption-engine-guard/domain/guard.js";

async function main(): Promise<void> {
  const [definitionPath, artifactPath, ...extra] = process.argv.slice(2);
  if (!definitionPath || !artifactPath || extra.length) {
    console.error("INVALID-ENGINE-GUARD-ARGUMENTS");
    process.exitCode = 1;
    return;
  }
  let runner: unknown;
  try {
    runner = JSON.parse(await readFile(definitionPath, "utf8"));
  } catch {
    console.error("INVALID-RUNNER-DEFINITION");
    process.exitCode = 1;
    return;
  }
  let rows: unknown;
  try {
    rows = JSON.parse(await readFile(artifactPath, "utf8"));
  } catch {
    console.error("INVALID-ADOPTION-ENGINE");
    process.exitCode = 1;
    return;
  }
  // The domain guard checks the runtime shape before invoking the sink.
  const result = await publishKnownEngineRows(
    rows as readonly unknown[],
    runner,
    (valid) => {
      process.stdout.write(`${JSON.stringify(valid, null, 2)}\n`);
    },
  );
  if (!result.ok) {
    console.error(result.reason);
    process.exitCode = 1;
  }
}

await main();
