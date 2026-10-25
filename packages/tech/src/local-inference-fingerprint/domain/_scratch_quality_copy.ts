import { createHash } from "node:crypto";

export const evaluatorVersion = "exact-text/v1";
export const sha256 = (text: string) =>
  createHash("sha256").update(text).digest("hex");
const engines = ["ollama", "llama.cpp", "mlx", "strata"];
type Fixture = { id: string; inputSha256: string; expected: string };
type Output = { runIndex: number; fixtureId: string; text: string };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Expected object");
  return value as Record<string, unknown>;
};
const hash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

/** Add quality without changing performance metrics or persisting generated text. */
export function enrichQuality(
  source: string,
  fixtureInput: unknown,
  evidenceInput: unknown,
) {
  const result = object(JSON.parse(source));
  if (
    result.schemaVersion !== 1 ||
    !hash(result.inputSha256) ||
    !Array.isArray(result.runs) ||
    !result.runs.length
  )
    throw new Error("Expected local-inference schemaVersion 1 result");
  const runs = result.runs.map((value) => {
    const run = object(value);
    if (
      typeof run.engine !== "string" ||
      !engines.includes(run.engine) ||
      typeof run.model !== "string" ||
      !run.model ||
      typeof run.status !== "string" ||
      !["measured", "failed"].includes(run.status)
    )
      throw new Error("Invalid run identity or status");
    if ("quality" in run) throw new Error("Quality already exists");
    return run;
  });
  if (!Array.isArray(fixtureInput) || !fixtureInput.length)
    throw new Error("Expected nonempty fixed fixture array");
  const fixtures = fixtureInput.map((value): Fixture => {
    const fixture = object(value);
    if (
      typeof fixture.id !== "string" ||
      !fixture.id ||
      !hash(fixture.inputSha256) ||
      typeof fixture.expected !== "string"
    )
      throw new Error("Invalid fixed fixture");
    return fixture as Fixture;
  });
  if (new Set(fixtures.map((f) => f.id)).size !== fixtures.length)
    throw new Error("Duplicate fixture id");
  const evidence = object(evidenceInput);
  if (
    evidence.sourceSha256 !== sha256(source) ||
    !Array.isArray(evidence.outputs)
  )
    throw new Error("Evidence must match exact source JSON SHA-256");
  const outputs = new Map<string, Output>();
  for (const value of evidence.outputs) {
    const output = object(value);
    if (
      !Number.isInteger(output.runIndex) ||
      Number(output.runIndex) < 0 ||
      Number(output.runIndex) >= runs.length ||
      !fixtures.some((f) => f.id === output.fixtureId) ||
      typeof output.text !== "string"
    )
      throw new Error("Invalid output evidence");
    const key = JSON.stringify([output.runIndex, output.fixtureId]);
    if (outputs.has(key)) throw new Error("Duplicate output evidence");
    outputs.set(key, output as Output);
  }
  return {
    ...result,
    qualitySchemaVersion: 1,
    qualitySourceSha256: sha256(source),
    runs: runs.map((run, index) =>
      Object.assign({}, run, {
        quality: fixtures.map((fixture) => {
          const output = outputs.get(JSON.stringify([index, fixture.id]));
          const reason =
            run.status === "failed"
              ? "MEASURE-FAILED"
              : fixture.inputSha256 !== result.inputSha256
                ? "INPUT-MISMATCH"
                : !output
                  ? "NO-OUTPUT"
                  : null;
          return {
            fixtureId: fixture.id,
            fixtureSha256: sha256(
              JSON.stringify([
                fixture.id,
                fixture.inputSha256,
                fixture.expected,
              ]),
            ),
            evaluatorVersion,
            verdict: reason
              ? "undetermined"
              : output?.text === fixture.expected
                ? "pass"
                : "fail",
            reason,
          };
        }),
      }),
    ),
  };
}
