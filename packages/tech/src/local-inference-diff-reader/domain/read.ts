/** Read the saved diff format, not a measurement artifact or an adoption decision. */
type ObjectValue = Record<string, unknown>;
export const RUNNER_RECOVERY = {
  code: "REMEASURE-BOTH-INPUTS",
  url: "https://github.com/qmu/research/blob/main/packages/tech/src/local-inference-diff-reader/README.md#remeasure",
} as const;
const supported = new Set([
  "local-inference/2",
  "local-inference/3",
  "local-inference/4",
]);
function object(value: unknown): ObjectValue {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error("INVALID-COMPARISON-JSON");
  return value as ObjectValue;
}
function version(execution: unknown): unknown {
  if (execution === undefined || execution === null) return undefined;
  return object(execution).runnerVersion;
}
function missing(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim() === "")
  );
}
function runnerFailure(before: unknown, after: unknown) {
  if (missing(before) || missing(after)) return "MISSING-RUNNER-VERSION";
  if (
    typeof before !== "string" ||
    typeof after !== "string" ||
    !supported.has(before) ||
    !supported.has(after)
  )
    return "UNKNOWN-RUNNER-VERSION";
  if (before !== after) return "RUNNER-VERSION-MISMATCH";
  return null;
}
function metrics(value: unknown, reason: string | null, comparable: boolean) {
  return Object.fromEntries(
    Object.entries(object(value)).map(([name, raw]) => {
      const metric = object(raw);
      if (
        metric.delta !== null &&
        (typeof metric.delta !== "number" || !Number.isFinite(metric.delta))
      )
        throw new Error("INVALID-COMPARISON-JSON");
      return [
        name,
        reason !== null || !comparable
          ? {
              ...metric,
              delta: null,
              reason: reason ?? "MISSING-OR-INCOMPARABLE",
            }
          : { ...metric },
      ];
    }),
  );
}

/** Never upgrades the upstream comparable flag or mutates the saved evidence. */
export function readComparisonDiff(input: unknown) {
  const data = object(input);
  if (
    data.schemaVersion !== 1 ||
    !Array.isArray(data.runs) ||
    !data.runs.length
  )
    throw new Error("INVALID-COMPARISON-JSON");
  const environment = object(data.environment);
  const execution =
    environment.execution === undefined || environment.execution === null
      ? {}
      : object(environment.execution);
  const reason = runnerFailure(
    version(execution.before),
    version(execution.after),
  );
  const identities = new Set<string>();
  const runs = data.runs.map((raw) => {
    const row = object(raw);
    if (
      !["ollama", "llama.cpp", "mlx", "strata"].includes(String(row.engine)) ||
      typeof row.model !== "string" ||
      !row.model.trim() ||
      typeof row.comparable !== "boolean" ||
      !["both", "added", "removed"].includes(String(row.presence))
    )
      throw new Error("INVALID-COMPARISON-JSON");
    const key = JSON.stringify([row.engine, row.model]);
    if (identities.has(key)) throw new Error("INVALID-COMPARISON-JSON");
    identities.add(key);
    const comparable =
      row.comparable && row.presence === "both" && reason === null;
    return {
      ...row,
      comparable,
      runnerFailure: reason,
      runnerRecovery: reason === null ? null : RUNNER_RECOVERY,
      speed: metrics(row.speed, reason, comparable),
      memory: metrics(row.memory, reason, comparable),
    };
  });
  return { ...data, runs };
}
