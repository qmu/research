/** Consumer of the version-1 saved process JSON contract in qmu/research#223. */
export const engines = ["strata", "ollama", "llama.cpp", "mlx"] as const;
const codes = [
  "TIMEOUT",
  "CANCELLED",
  "UNREACHABLE",
  "MEASURE-FAILED",
] as const;
type Engine = (typeof engines)[number];
type Evidence = {
  schema_version: 1;
  engine: Engine;
  status: "ok" | "failed";
  process: { exit_code: number | null; signal: string | null };
  failure: { code: (typeof codes)[number] } | null;
};
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Validate saved evidence without publishing arbitrary diagnostics or input values. */
export function parseProcessEvidence(value: unknown): Evidence {
  const row = object(value);
  const process = object(row.process);
  const code = object(row.failure).code;
  const exit = process.exit_code;
  const signal = process.signal;
  if (
    row.schema_version !== 1 ||
    !engines.includes(row.engine as Engine) ||
    !["ok", "failed"].includes(row.status as string) ||
    !(exit === null || (Number.isSafeInteger(exit) && (exit as number) >= 0)) ||
    !(
      signal === null ||
      (typeof signal === "string" && /^SIG[A-Z0-9]{1,16}$/.test(signal))
    ) ||
    !(row.failure === null || codes.includes(code as (typeof codes)[number])) ||
    (row.status === "ok" &&
      (exit !== 0 || signal !== null || row.failure !== null)) ||
    (row.status === "failed" && row.failure === null)
  )
    throw new Error("Invalid saved process evidence");
  return {
    schema_version: 1,
    engine: row.engine as Engine,
    status: row.status as Evidence["status"],
    process: {
      exit_code: exit as number | null,
      signal: signal as string | null,
    },
    failure:
      row.failure === null ? null : { code: code as (typeof codes)[number] },
  };
}

/** One saved execution per engine; never silently choose among conflicting runs. */
export function renderProcessComparison(values: readonly unknown[]): string {
  const rows = new Map<Engine, Evidence>();
  for (const value of values) {
    const row = parseProcessEvidence(value);
    if (rows.has(row.engine))
      throw new Error("Duplicate engine process evidence");
    rows.set(row.engine, row);
  }
  return [
    "## Process evidence and adoption",
    "",
    "Saved process evidence only. Exit 0 does not establish speed, quality or memory suitability. Missing evidence is not a successful measurement. Exit 137 is not classified as OOM without additional evidence.",
    "",
    "| Engine | Process exit | Signal | Fixed failure code | Adoption |",
    "| --- | --- | --- | --- | --- |",
    ...engines.map((engine) => {
      const row = rows.get(engine);
      if (!row)
        return `| ${engine} | not recorded | not recorded | not recorded | Pending — process evidence missing |`;
      return `| ${engine} | ${row.process.exit_code ?? "not available"} | ${row.process.signal ?? "none"} | ${row.failure?.code ?? "none"} | ${row.failure ? `Hold — ${row.failure.code}` : "Pending — speed, quality and memory evaluation required"} |`;
    }),
    "",
  ].join("\n");
}
