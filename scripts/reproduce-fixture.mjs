#!/usr/bin/env node
// One keyless path through the existing RAG comparison generator. Keep its JSON
// schema and Markdown renderer; do not maintain a second comparison format here.
import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, process.argv[2] ?? "outputs/reproduce-fixture");
await mkdir(output, { recursive: true });
const report = resolve(output, "rag-benchmark.md");
// Remove previous successes so a failed rerun cannot masquerade as fresh data.
for (const name of [
  "rag-benchmark.md",
  "rag-benchmark.data.json",
  "exit-code.txt",
]) {
  await rm(resolve(output, name), { force: true });
}
let log = "";
const child = spawn(
  process.execPath,
  ["--import", "tsx/esm", "src/entrypoints/run-rag-benchmark.ts", "--fixture"],
  {
    cwd: resolve(root, "packages/tech"),
    env: { ...process.env, OUTPUT_PATH: report },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const capture = (stream) => (chunk) => {
  log += chunk.toString();
  stream.write(chunk);
};
child.stdout.on("data", capture(process.stdout));
child.stderr.on("data", capture(process.stderr));
child.on("error", (error) => {
  log += `${error.message}\n`;
});
const code = await new Promise((done) => {
  child.on("close", (status) => done(status ?? 1));
});
await writeFile(resolve(output, "command-output.txt"), log);
await writeFile(resolve(output, "exit-code.txt"), `${code}\n`);
process.stdout.write(`exit-code: ${code}\nartifacts: ${output}\n`);
process.exitCode = code;
