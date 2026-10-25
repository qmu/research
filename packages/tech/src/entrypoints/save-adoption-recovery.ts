import { readFile } from "node:fs/promises";
import { saveAdoptionRecoveryIntent } from "../adoption-recovery/store.js";
try {
  const [output, contextPath, intentPath, ...extra] = process.argv.slice(2);
  if (!output || !contextPath || !intentPath || extra.length)
    throw new Error("INVALID-ARGS");
  const context = JSON.parse(await readFile(contextPath, "utf8"));
  const intent = JSON.parse(await readFile(intentPath, "utf8"));
  const request = await saveAdoptionRecoveryIntent(
    output,
    context.binding,
    intent,
  );
  process.stdout.write(JSON.stringify(request) + "\n");
} catch {
  process.stderr.write("ADOPTION-RECOVERY-SAVE-FAILED\n");
  process.exitCode = 1;
}
