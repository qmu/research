import { readFile } from "node:fs/promises";
import { createPeakRssRemeasurementRequest } from "../peak-rss-remeasurement/domain/request.js";

// JSON files are data only; no command or inference process is executed.
const args = process.argv.slice(2);
try {
  if (args.length !== 2) throw new Error("INVALID-ARGUMENTS");
  const [expected, snapshot] = await Promise.all(
    args.map(
      async (path) => JSON.parse(await readFile(path, "utf8")) as unknown,
    ),
  );
  const request = createPeakRssRemeasurementRequest(expected, snapshot);
  process.stdout.write(`${JSON.stringify(request, null, 2)}\n`);
  process.exitCode = request ? 2 : 0;
} catch {
  // Never expose paths, JSON content, or OS diagnostics from untrusted input.
  process.stderr.write("PEAK-RSS-REQUEST-REJECTED\n");
  process.exitCode = 1;
}
