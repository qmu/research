import { readFile } from "node:fs/promises";
import {
  runStrataExecutor,
  saveStrataRun,
  type RunStrataExecutorOptions,
} from "../local-inference/strata-executor";

// Thin entrypoint: read the run config, execute Strata once, save the row into
// the shared local-inference JSON. No measurement or classification logic
// lives here — see `../local-inference/strata-executor` and
// `../local-inference/domain/strata-run`.

export function parseCliConfig(input: unknown): RunStrataExecutorOptions {
  if (typeof input !== "object" || input === null) {
    throw new Error("Expected a config object");
  }
  const config = input as Record<string, unknown>;
  if (typeof config.command !== "string" || config.command.length === 0) {
    throw new Error("config.command must be a non-empty string");
  }
  if (
    !Array.isArray(config.args) ||
    !config.args.every((arg) => typeof arg === "string")
  ) {
    throw new Error("config.args must be an array of strings");
  }
  if (
    typeof config.timeoutMs !== "number" ||
    !Number.isFinite(config.timeoutMs) ||
    config.timeoutMs <= 0
  ) {
    throw new Error("config.timeoutMs must be a positive number");
  }
  if (
    typeof config.outputsPath !== "string" ||
    config.outputsPath.length === 0
  ) {
    throw new Error("config.outputsPath must be a non-empty string");
  }
  if (typeof config.model !== "string" || config.model.length === 0) {
    throw new Error("config.model must be a non-empty string");
  }
  if (
    typeof config.runtimeVersion !== "string" ||
    config.runtimeVersion.length === 0
  ) {
    throw new Error("config.runtimeVersion must be a non-empty string");
  }
  if (
    typeof config.condition !== "object" ||
    config.condition === null ||
    Array.isArray(config.condition) ||
    !Object.values(config.condition as Record<string, unknown>).every(
      (value) =>
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && Number.isFinite(value)),
    )
  ) {
    throw new Error(
      "config.condition must be a flat string/number/boolean map",
    );
  }
  return {
    command: config.command as string,
    args: config.args as string[],
    cwd: typeof config.cwd === "string" ? config.cwd : undefined,
    timeoutMs: config.timeoutMs as number,
    outputsPath: config.outputsPath as string,
    model: config.model as string,
    runtimeVersion: config.runtimeVersion as string,
    condition: config.condition as Record<string, string | number | boolean>,
  };
}

const main = async (): Promise<void> => {
  const [configPath, outputPath] = process.argv.slice(2);
  if (!configPath || !outputPath) {
    throw new Error(
      "Usage: run-strata-executor <config.json> <common-output.json>",
    );
  }
  const config = parseCliConfig(JSON.parse(await readFile(configPath, "utf8")));
  const run = await runStrataExecutor(config);
  await saveStrataRun(run, outputPath);
  process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
  if (run.status !== "measured") {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  process.stderr.write(`strata executor failed: ${String(error)}\n`);
  process.exitCode = 1;
});
