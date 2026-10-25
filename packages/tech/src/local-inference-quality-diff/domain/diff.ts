type ObjectValue = Record<string, unknown>;
type Judgment = {
  fixtureId: string;
  fixtureSha256: string;
  evaluatorVersion: string;
  verdict: "pass" | "fail" | "undetermined";
  reason: string | null;
};
const object = (value: unknown): ObjectValue => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as ObjectValue;
};
const hash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const sorted = (keys: Iterable<string>) => [...new Set(keys)].sort();

function parse(input: unknown) {
  const result = object(input);
  if (
    result.schemaVersion !== 1 ||
    !hash(result.inputSha256) ||
    !Array.isArray(result.runs) ||
    !result.runs.length
  )
    throw new Error("Expected common inference schemaVersion 1");
  const runs = new Map<
    string,
    { engine: string; model: string; quality: Map<string, Judgment> }
  >();
  for (const value of result.runs) {
    const run = object(value);
    if (
      typeof run.engine !== "string" ||
      !["ollama", "llama.cpp", "mlx", "strata"].includes(run.engine) ||
      typeof run.model !== "string" ||
      !run.model ||
      (run.quality !== undefined && !Array.isArray(run.quality))
    )
      throw new Error("Invalid run");
    const quality = new Map<string, Judgment>();
    for (const entry of (run.quality ?? []) as unknown[]) {
      const q = object(entry);
      if (
        typeof q.fixtureId !== "string" ||
        !q.fixtureId ||
        !hash(q.fixtureSha256) ||
        typeof q.evaluatorVersion !== "string" ||
        !q.evaluatorVersion ||
        !["pass", "fail", "undetermined"].includes(String(q.verdict)) ||
        (q.verdict === "undetermined"
          ? typeof q.reason !== "string" || !q.reason
          : q.reason !== null)
      )
        throw new Error("Invalid quality judgment");
      if (quality.has(q.fixtureId))
        throw new Error("Duplicate fixture identity");
      // Explicit projection: generated text and arbitrary metadata never reach output.
      quality.set(q.fixtureId, {
        fixtureId: q.fixtureId,
        fixtureSha256: String(q.fixtureSha256),
        evaluatorVersion: q.evaluatorVersion,
        verdict: q.verdict as Judgment["verdict"],
        reason: q.reason as string | null,
      });
    }
    const key = JSON.stringify([run.engine, run.model]);
    if (runs.has(key)) throw new Error("Duplicate run identity");
    runs.set(key, { engine: run.engine, model: run.model, quality });
  }
  return { inputSha256: result.inputSha256, runs };
}

/** Compare recorded quality only, keyed by engine/model and fixture ID. */
export function diffQuality(beforeInput: unknown, afterInput: unknown) {
  const before = parse(beforeInput),
    after = parse(afterInput);
  return {
    schemaVersion: 1,
    runs: sorted([...before.runs.keys(), ...after.runs.keys()]).map((key) => {
      const b = before.runs.get(key),
        a = after.runs.get(key);
      const identity = a ?? b;
      if (!identity) throw new Error("Missing run");
      return {
        engine: identity.engine,
        model: identity.model,
        fixtures: sorted([
          ...(b?.quality.keys() ?? []),
          ...(a?.quality.keys() ?? []),
        ]).map((id) => {
          const previous = b?.quality.get(id) ?? null;
          const current = a?.quality.get(id) ?? null;
          const change = !previous
            ? "added"
            : !current
              ? "removed"
              : before.inputSha256 !== after.inputSha256 ||
                  previous.fixtureSha256 !== current.fixtureSha256 ||
                  previous.evaluatorVersion !== current.evaluatorVersion
                ? "incomparable"
                : previous.verdict === "undetermined" ||
                    current.verdict === "undetermined"
                  ? "undetermined"
                  : previous.verdict === current.verdict
                    ? "unchanged"
                    : current.verdict === "pass"
                      ? "improved"
                      : "regressed";
          return { fixtureId: id, change, before: previous, after: current };
        }),
      };
    }),
  };
}
