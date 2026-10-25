/** Stable template identifier, not a run ID or a hash of command text. */
export const REPRODUCTION_COMMAND_ID = "local-inference.reproduce.v1";

export type AdoptionCommandRow = Readonly<{
  id: string;
  verdict: "adopted" | "rejected";
  commandId: typeof REPRODUCTION_COMMAND_ID;
  engineVersion: string;
  model: string;
  fixtureVersion: string;
  runnerVersion: string;
}>;

const publicValue = (value: unknown): string => {
  // Public identifiers only: never accept shell syntax, flags, or credentials.
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._/:@+-]{0,199}$/.test(value) ||
    /key|token|secret|password|credential|profile/i.test(value)
  ) {
    throw new Error("invalid-public-condition");
  }
  return value;
};

/** Allowlist persisted fields; unknown input (including command text) is dropped. */
export const parseAdoptionCommandRow = (input: unknown): AdoptionCommandRow => {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("invalid-adoption-row");
  }
  const row = input as Record<string, unknown>;
  if (row.commandId !== REPRODUCTION_COMMAND_ID) {
    throw new Error("unknown-reproduction-command-id");
  }
  if (row.verdict !== "adopted" && row.verdict !== "rejected") {
    throw new Error("invalid-adoption-verdict");
  }
  return {
    id: publicValue(row.id),
    verdict: row.verdict,
    commandId: REPRODUCTION_COMMAND_ID,
    engineVersion: publicValue(row.engineVersion),
    model: publicValue(row.model),
    fixtureVersion: publicValue(row.fixtureVersion),
    runnerVersion: publicValue(row.runnerVersion),
  };
};

/** Use this boundary before writing a row, so command bodies cannot be saved. */
export const serializeAdoptionCommandRow = (input: unknown): string =>
  JSON.stringify(parseAdoptionCommandRow(input), null, 2) + "\n";

/** Resolve only a known versioned template, revalidating even typed callers. */
export const resolveAdoptionCommand = (input: AdoptionCommandRow): string => {
  const row = parseAdoptionCommandRow(input);
  return (
    "npm run local-inference --" +
    ` --engine-version '${row.engineVersion}'` +
    ` --model '${row.model}'` +
    ` --fixture-version '${row.fixtureVersion}'` +
    ` --runner-version '${row.runnerVersion}'`
  );
};
