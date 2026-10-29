import { readFile } from "node:fs/promises";
import { readSavedForAdoption } from "../local-inference-saved/domain/read.js";

// All arguments are positional so missing/unknown flags cannot become defaults.
const [commit, runnerVersion, runId, ...paths] = process.argv.slice(2);
if (!commit || !runnerVersion || !runId || !paths.length)
  throw new Error(
    "Usage: read-saved-local-inference <full-commit> <runner-version> <run-id> <saved.json>...",
  );
const current = { targetCommit: commit, runnerVersion, runId };
// Reject invalid current conditions before reading or emitting any artifacts.
readSavedForAdoption([], current);
const saved: unknown[] = await Promise.all(
  paths.map(
    async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
  ),
);
console.log(JSON.stringify(readSavedForAdoption(saved, current), null, 2));
