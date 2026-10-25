import { readFile } from "node:fs/promises";
import {
  validateDownloadIdentity,
  verifiedDownloadSnapshot,
} from "../local-inference-download/domain/snapshot.js";

// stdout is the download body. Never emit a partial body or source diagnostics.
try {
  const args = process.argv.slice(2);
  if (args.length !== 4 || !args[0]) throw new Error("arguments");
  const expected = validateDownloadIdentity({
    runId: args[1],
    targetCommit: args[2],
    runnerVersion: args[3],
  });
  const snapshot = await readFile(args[0], "utf8");
  process.stdout.write(verifiedDownloadSnapshot(snapshot, expected));
} catch {
  process.stderr.write("DOWNLOAD-SNAPSHOT-REJECTED\n");
  process.exitCode = 1;
}
