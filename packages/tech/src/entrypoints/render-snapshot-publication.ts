import { readFileSync } from "node:fs";
import {
  renderVerifiedSnapshotResults,
  type VerifiedSnapshotResult,
} from "../snapshot-publication/domain/markdown.js";

// Publication consumes verifier output; it does not inspect raw measurement JSON.
// Buffer the whole rendering before stdout so a rejected row publishes nothing.
try {
  const path = process.argv[2];
  if (!path || process.argv.length !== 3) {
    throw new Error(
      "Usage: render-snapshot-publication.ts <verified-results.json>",
    );
  }
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed))
    throw new Error("Expected a verified result array");
  process.stdout.write(
    renderVerifiedSnapshotResults(parsed as VerifiedSnapshotResult[]),
  );
} catch {
  // Never echo input JSON, paths, or parser errors into public logs.
  process.stderr.write(
    "Snapshot publication rejected: invalid verified results or arguments.\n",
  );
  process.exitCode = 1;
}
