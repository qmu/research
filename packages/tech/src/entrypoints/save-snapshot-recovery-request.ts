import { saveSnapshotRecoveryRequest } from "../remeasurement/recovery-store.js";

try {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--store" || !args[1])
    throw new Error("INVALID-ARGUMENTS");
  let json = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) json += chunk;
  const result = await saveSnapshotRecoveryRequest(args[1], JSON.parse(json));
  process.stdout.write(JSON.stringify(result) + "\n");
} catch {
  process.stderr.write("RECOVERY-SAVE-FAILED\n");
  process.exitCode = 1;
}
