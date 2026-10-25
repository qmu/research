import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Preserve the renderer's raw exit code alongside its output, including failure.
export function reproduce(outputDir, run = spawnSync) {
  const output = resolve(outputDir);
  mkdirSync(output, { recursive: true });
  const json = join(output, "comparison.json");
  const table = join(output, "comparison.md");
  for (const name of [
    "comparison.json",
    "comparison.md",
    "stdout.txt",
    "stderr.txt",
    "exit-code.txt",
  ]) {
    rmSync(join(output, name), { force: true });
  }
  let code = 1;
  let stdout = "";
  let stderr = "";
  try {
    copyFileSync(
      join(root, "packages/tech/src/local-inference/fixtures/comparison.json"),
      json,
    );
    const result = run(
      process.execPath,
      [
        "--import",
        "tsx/esm",
        "src/entrypoints/render-local-inference.ts",
        json,
        table,
      ],
      { cwd: join(root, "packages/tech"), encoding: "utf8" },
    );
    stdout = result.stdout ?? "";
    stderr = result.stderr ?? "";
    code = result.status ?? 1;
    if (result.error) stderr += `${result.error.message}\n`;
    if (result.signal) stderr += `Renderer terminated by ${result.signal}\n`;
  } catch (error) {
    stderr += `${error.message}\n`;
  }
  if (code !== 0) rmSync(table, { force: true });
  writeFileSync(join(output, "stdout.txt"), stdout);
  writeFileSync(join(output, "stderr.txt"), stderr);
  writeFileSync(join(output, "exit-code.txt"), `${code}\n`);
  return code;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [output = join(root, "outputs/local-inference-fixture"), ...extra] =
    process.argv.slice(2);
  if (extra.length) {
    console.error(
      "Usage: node scripts/reproduce-local-inference.mjs [output-directory]",
    );
    process.exitCode = 1;
  } else {
    process.exitCode = reproduce(output);
    console.log(
      `Local inference fixture: ${resolve(output)} (exit ${process.exitCode})`,
    );
  }
}
