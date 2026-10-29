import { saveRemeasurementRequest } from "../remeasurement/request-store.js";

// JSON on stdin; explicit store directory, no checkout-derived defaults.
try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--store" || !args[1])
    throw new Error("INVALID-ARGUMENTS");
  let json = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) json += chunk;
  const input: unknown = JSON.parse(json);
  const result = await saveRemeasurementRequest(args[1], input);
  process.stdout.write(JSON.stringify(result) + "\n");
} catch {
  // Paths, payloads and OS errors may contain secrets.
  process.stderr.write("REMEASUREMENT-SAVE-FAILED\n");
  process.exitCode = 1;
}
