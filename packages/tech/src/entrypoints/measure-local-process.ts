import {
  saveProcessMeasurement,
  type Engine,
} from "../local-inference/vendors/process.js";

const [engine, output, timeout, command, ...args] = process.argv.slice(2);
if (
  !["strata", "ollama", "llama.cpp", "mlx"].includes(engine) ||
  !output ||
  !command
) {
  console.error(
    "Usage: measure-local-process <engine> <new.json> <timeout-ms> <command> [args...]",
  );
  process.exitCode = 2;
} else {
  try {
    const result = await saveProcessMeasurement(output, {
      engine: engine as Engine,
      command,
      args,
      timeoutMs: Number(timeout),
    });
    // Captured diagnostics can contain credentials; keep them in the local file.
    const { output: captured, ...summary } = result;
    console.log(
      JSON.stringify({
        ...summary,
        output: Object.fromEntries(
          Object.entries(captured).map(
            ([stream, { data: _data, ...metadata }]) => [stream, metadata],
          ),
        ),
      }),
    );
    process.exitCode = result.status === "ok" ? 0 : 1;
  } catch {
    console.error(
      "Could not save measurement; check deadline and output path.",
    );
    process.exitCode = 2;
  }
}
