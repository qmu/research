import {
  runLocalInferenceProcess,
  type ProcessRun,
} from "../local-inference-process/run.js";

async function main() {
  const [engine, output, separator, ...command] = process.argv.slice(2);
  if (!engine || !output || separator !== "--" || command.length === 0)
    throw new Error(
      "Usage: local-inference-process <engine> <new-output.json> -- <local-engine-command> [args...]",
    );
  const result = await runLocalInferenceProcess(
    { engine: engine as ProcessRun["engine"], command },
    output,
  );
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "measured") process.exitCode = 1;
}

main().catch(() => {
  console.error(
    "Local inference run failed; check configuration and output path.",
  );
  process.exitCode = 1;
});
