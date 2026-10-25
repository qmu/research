type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as ObjectValue;
};

/** Sort object keys recursively; array order carries meaning and is preserved. */
export function stableJson(value: unknown): string {
  return (
    JSON.stringify(
      value,
      (_key, item: unknown) => {
        if (item && typeof item === "object" && !Array.isArray(item))
          return Object.fromEntries(
            Object.entries(item).sort(([a], [b]) =>
              a < b ? -1 : a > b ? 1 : 0,
            ),
          );
        return item;
      },
      2,
    ) + "\n"
  );
}
const same = (a: unknown, b: unknown) => stableJson(a) === stableJson(b);
const pair = (before: unknown, after: unknown) => ({
  before: before ?? null,
  after: after ?? null,
  changed: !same(before ?? null, after ?? null),
});

function parse(input: unknown) {
  const result = object(input);
  if (
    result.schemaVersion !== 1 ||
    !Array.isArray(result.runs) ||
    !result.runs.length ||
    typeof result.inputSha256 !== "string" ||
    !/^[a-f0-9]{64}$/.test(result.inputSha256)
  )
    throw new Error("Expected local-inference schemaVersion 1");
  object(result.sampling);
  const runs = new Map<string, ObjectValue>();
  for (const value of result.runs) {
    const run = object(value);
    if (
      typeof run.engine !== "string" ||
      !["ollama", "llama.cpp", "mlx", "strata"].includes(run.engine) ||
      typeof run.model !== "string" ||
      !run.model ||
      typeof run.runtimeVersion !== "string" ||
      !["measured", "failed"].includes(String(run.status))
    )
      throw new Error("Invalid run");
    object(run.condition);
    for (const value of Object.values(object(run.metrics))) {
      const metric = object(value);
      if (
        typeof metric.unit !== "string" ||
        (metric.value === null
          ? typeof metric.reason !== "string"
          : typeof metric.value !== "number" || !Number.isFinite(metric.value))
      )
        throw new Error("Invalid metric");
    }
    if (run.quality !== undefined && !Array.isArray(run.quality))
      throw new Error("Invalid quality");
    const key = JSON.stringify([run.engine, run.model]);
    if (runs.has(key)) throw new Error("Ambiguous duplicate engine/model");
    runs.set(key, run);
  }
  return { result, runs };
}

/** Compare saved observations only; never invoke an engine or infer a missing value. */
export function diffInference(beforeInput: unknown, afterInput: unknown) {
  const before = parse(beforeInput),
    after = parse(afterInput);
  const sharedConditions =
    same(before.result.inputSha256, after.result.inputSha256) &&
    same(before.result.sampling, after.result.sampling) &&
    same(before.result.procedure, after.result.procedure);
  const keys = [
    ...new Set([...before.runs.keys(), ...after.runs.keys()]),
  ].sort();
  return {
    schemaVersion: 1,
    conditions: Object.fromEntries(
      ["inputSha256", "sampling", "procedure"].map((key) => [
        key,
        pair(before.result[key], after.result[key]),
      ]),
    ),
    environment: Object.fromEntries(
      ["fingerprint", "execution"].map((key) => [
        key,
        pair(before.result[key], after.result[key]),
      ]),
    ),
    runs: keys.map((key) => {
      const b = before.runs.get(key),
        a = after.runs.get(key);
      const comparable = Boolean(
        b &&
        a &&
        sharedConditions &&
        same(b.condition, a.condition) &&
        same(b.runtimeVersion, a.runtimeVersion) &&
        same(before.result.fingerprint, after.result.fingerprint) &&
        same(before.result.execution, after.result.execution) &&
        b.status === "measured" &&
        a.status === "measured",
      );
      const metrics = (names: string[]) =>
        Object.fromEntries(
          names.map((name) => {
            const bm = b ? object(b.metrics)[name] : undefined;
            const am = a ? object(a.metrics)[name] : undefined;
            const bv = bm === undefined ? undefined : object(bm);
            const av = am === undefined ? undefined : object(am);
            const numeric =
              comparable &&
              bv &&
              av &&
              typeof bv.value === "number" &&
              typeof av.value === "number" &&
              bv.unit === av.unit &&
              same(bv.source, av.source);
            const delta = numeric ? Number(av.value) - Number(bv.value) : null;
            if (delta !== null && !Number.isFinite(delta))
              throw new Error("Metric delta overflow");
            return [
              name,
              {
                ...pair(bm, am),
                delta,
                reason: numeric ? null : "MISSING-OR-INCOMPARABLE",
              },
            ];
          }),
        );
      const identity = a ?? b;
      return {
        engine: identity?.engine,
        model: identity?.model,
        presence: b && a ? "both" : b ? "removed" : "added",
        comparable,
        environment: Object.fromEntries(
          ["runtimeVersion", "condition", "status"].map((name) => [
            name,
            pair(b?.[name], a?.[name]),
          ]),
        ),
        speed: metrics(["completion_tokens", "startup_time", "tps", "ttft"]),
        memory: metrics(["peak_rss"]),
        quality: pair(b?.quality, a?.quality),
      };
    }),
  };
}
