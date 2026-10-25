import { spawn } from "node:child_process";
import type { StrataProcessOutcome } from "../domain/strata-run";

export type StrataProcessOptions = Readonly<{
  command: string;
  args: ReadonlyArray<string>;
  cwd?: string;
  timeoutMs: number;
}>;

// Runs Strata's own CLI (`strata bench run ...`, supplied by the caller — see
// README.md) as a child process and classifies how it ended, without ever
// rejecting: a spawn failure (missing binary, bad cwd) resolves as an `exit`
// outcome with code `-1` so a caller always gets a row to save, never an
// uncaught error. stdout/stderr are not captured — the benchmark's measured
// record lives in the outputs.jsonl file Strata writes, read separately by
// `../strata-executor` only after a clean exit, so a model's answer text and
// any local path a crash prints to stderr never pass through this process.
export function runStrataProcess(
  options: StrataProcessOptions,
): Promise<StrataProcessOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (outcome: StrataProcessOutcome): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(outcome);
    };

    const child = spawn(options.command, [...options.args], {
      cwd: options.cwd,
      stdio: "ignore",
    });

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish({ kind: "timeout" });
    }, options.timeoutMs);

    child.on("error", () => {
      finish({ kind: "exit", exitCode: -1 });
    });
    child.on("close", (code) => {
      finish({ kind: "exit", exitCode: code ?? -1 });
    });
  });
}
