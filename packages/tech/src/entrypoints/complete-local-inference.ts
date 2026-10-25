import { readFile } from "node:fs/promises";
import { parseCompletionNotice } from "../local-inference/domain/completion-notice.js";
import {
  completeExecution,
  isStaleExecutionError,
} from "../local-inference/vendors/versioned-result.js";

// External workers must return the reservation they received at launch. Never
// reserve here: doing so would turn a late notice into a new current execution.
try {
  const [noticePath, output, ...extra] = process.argv.slice(2);
  if (!noticePath || !output || extra.length) throw new Error("arguments");
  const notice = parseCompletionNotice(
    JSON.parse(await readFile(noticePath, "utf8")),
  );
  await completeExecution(output, notice.execution, notice.result);
  console.log(JSON.stringify({ status: "saved", execution: notice.execution }));
} catch (error) {
  // Do not echo paths, payloads or filesystem errors from worker input.
  console.error(
    JSON.stringify({
      status: "failed",
      code: isStaleExecutionError(error)
        ? "STALE-EXECUTION"
        : "COMPLETION-FAILED",
    }),
  );
  process.exitCode = 1;
}
