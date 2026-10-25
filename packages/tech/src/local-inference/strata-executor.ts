import { readFile, writeFile } from "node:fs/promises";
import {
  buildStrataRun,
  type StrataRun,
  type StrataRunIdentity,
} from "./domain/strata-run";
import {
  runStrataProcess,
  type StrataProcessOptions,
} from "./vendors/strata-process";

export type RunStrataExecutorOptions = StrataRunIdentity &
  StrataProcessOptions &
  Readonly<{
    // Path to the outputs.jsonl file `command` writes its measurement line(s)
    // to. Read only after the process exits 0 — a timeout or nonzero exit
    // never attempts to read it, since a killed/failed run can leave it
    // partially written.
    outputsPath: string;
  }>;

// Connects the Strata executor to one measurement attempt: runs the process,
// and — only on a clean exit — reads the last line Strata wrote to
// `outputsPath`. The result is always a `StrataRun`, whether the process
// finished, timed out, or exited with a failing code; there is no code path
// that loses an attempt to an uncaught exception.
export async function runStrataExecutor(
  options: RunStrataExecutorOptions,
): Promise<StrataRun> {
  const identity: StrataRunIdentity = {
    model: options.model,
    runtimeVersion: options.runtimeVersion,
    condition: options.condition,
  };
  const outcome = await runStrataProcess(options);
  if (outcome.kind !== "exit" || outcome.exitCode !== 0) {
    return buildStrataRun(identity, outcome);
  }
  const lastLine = await readLastNonEmptyLine(options.outputsPath);
  return buildStrataRun(identity, { kind: "completed", lastLine });
}

async function readLastNonEmptyLine(path: string): Promise<string | null> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return null;
  }
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);
  return lines.length > 0 ? lines[lines.length - 1] : null;
}

// Kept maximally loose (`unknown`) on purpose: this file only ever writes a
// `StrataRun` itself, and must not assume the shape of a row some other
// engine's executor saved to the same path.
export type CommonInferenceJson = Readonly<{
  schemaVersion: 1;
  generatedAt: string;
  runs: ReadonlyArray<unknown>;
}>;

const engineNameOf = (row: unknown): unknown =>
  typeof row === "object" && row !== null
    ? (row as Readonly<Record<string, unknown>>).engine
    : undefined;

// Saves one Strata run into the shared local-inference JSON at `outputPath`.
// An existing file is read back and re-saved rather than overwritten outright:
// any row already saved there by another engine's executor (`engine` other
// than `"strata"`) is kept, and a prior `strata` row is replaced rather than
// duplicated, so re-running this executor against the same output path
// updates its own measurement instead of accumulating stale ones.
export async function saveStrataRun(
  run: StrataRun,
  outputPath: string,
): Promise<CommonInferenceJson> {
  const existingRuns = await readExistingRuns(outputPath);
  const result: CommonInferenceJson = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runs: [
      ...existingRuns.filter((row) => engineNameOf(row) !== "strata"),
      run,
    ],
  };
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", "utf8");
  return result;
}

async function readExistingRuns(path: string): Promise<ReadonlyArray<unknown>> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (typeof parsed !== "object" || parsed === null) {
    return [];
  }
  const runs = (parsed as Readonly<Record<string, unknown>>).runs;
  return Array.isArray(runs) ? runs : [];
}
