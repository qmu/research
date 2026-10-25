import { link, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  validateDownloadIdentity,
  verifiedDownloadSnapshot,
} from "../local-inference-download/domain/snapshot.js";

// Publish a fully written, verified snapshot without replacing any existing file.
let temporary: string | undefined;
try {
  const args = process.argv.slice(2);
  if (args.length !== 5 || !args[0] || !args[1]) throw new Error("arguments");
  const expected = validateDownloadIdentity({
    runId: args[2],
    targetCommit: args[3],
    runnerVersion: args[4],
  });
  const snapshot = verifiedDownloadSnapshot(
    await readFile(args[0], "utf8"),
    expected,
  );
  temporary = await mkdtemp(join(dirname(args[1]), ".inference-export-"));
  const staged = join(temporary, "snapshot.json");
  await writeFile(staged, snapshot, { flag: "wx", mode: 0o600 });
  // link is exclusive and atomic: readers never see a partial destination.
  await link(staged, args[1]);
} catch {
  process.stderr.write("EXPORT-SNAPSHOT-REJECTED\n");
  process.exitCode = 1;
} finally {
  if (temporary) {
    try {
      await rm(temporary, { recursive: true, force: true });
    } catch {
      process.stderr.write("EXPORT-CLEANUP-FAILED\n");
      process.exitCode = 1;
    }
  }
}
