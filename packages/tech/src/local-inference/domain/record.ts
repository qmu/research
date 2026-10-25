// Common local-inference JSON record: the shared artifact an inference run
// writes and the comparison page reads. Only the fields needed to reproduce a
// run safely are modeled here — model condition, runner identity, and a
// redacted command fingerprint. Parsing allowlists these fields explicitly, so
// an unknown or secret-shaped key in the input JSON (an API key, a raw
// argument vector, a filesystem path) is dropped rather than carried through
// to the rendered page.

export const SCHEMA_VERSION = 1 as const;

export type RunnerInfo = Readonly<{
  name: string;
  version: string;
}>;

export type ModelCondition = Readonly<{
  model: string;
  quantization: string;
  condition: string;
}>;

export type InferenceRun = Readonly<{
  id: string;
  backend: string;
  modelCondition: ModelCondition;
  runner: RunnerInfo;
  commandFingerprint: string;
}>;

export type ComparisonFile = Readonly<{
  schemaVersion: typeof SCHEMA_VERSION;
  fixture: boolean;
  runs: readonly InferenceRun[];
}>;

export const COMMAND_FINGERPRINT_PATTERN = /^sha256:[0-9a-f]{64}$/;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;

const requireNonEmptyString = (value: unknown, field: string): string => {
  if (!isNonEmptyString(value)) {
    throw new Error(`${field} must be a nonempty string`);
  }
  return value;
};

const parseModelCondition = (value: unknown, field: string): ModelCondition => {
  const obj = asRecord(value);
  if (obj === undefined) {
    throw new Error(`${field} must be an object`);
  }
  return {
    model: requireNonEmptyString(obj.model, `${field}.model`),
    quantization: requireNonEmptyString(
      obj.quantization,
      `${field}.quantization`,
    ),
    condition: requireNonEmptyString(obj.condition, `${field}.condition`),
  };
};

const parseRunnerInfo = (value: unknown, field: string): RunnerInfo => {
  const obj = asRecord(value);
  if (obj === undefined) {
    throw new Error(`${field} must be an object`);
  }
  return {
    name: requireNonEmptyString(obj.name, `${field}.name`),
    version: requireNonEmptyString(obj.version, `${field}.version`),
  };
};

const parseCommandFingerprint = (value: unknown, field: string): string => {
  const fingerprint = requireNonEmptyString(value, field);
  if (!COMMAND_FINGERPRINT_PATTERN.test(fingerprint)) {
    throw new Error(`${field} must match sha256:<64 hex chars>`);
  }
  return fingerprint;
};

const parseRun = (
  value: unknown,
  index: number,
  seenIds: Set<string>,
): InferenceRun => {
  const obj = asRecord(value);
  const field = `runs[${index}]`;
  if (obj === undefined) {
    throw new Error(`${field} must be an object`);
  }
  const id = requireNonEmptyString(obj.id, `${field}.id`);
  if (seenIds.has(id)) {
    throw new Error(`duplicate run id: ${id}`);
  }
  seenIds.add(id);

  return {
    id,
    backend: requireNonEmptyString(obj.backend, `${field}.backend`),
    modelCondition: parseModelCondition(
      obj.modelCondition,
      `${field}.modelCondition`,
    ),
    runner: parseRunnerInfo(obj.runner, `${field}.runner`),
    commandFingerprint: parseCommandFingerprint(
      obj.commandFingerprint,
      `${field}.commandFingerprint`,
    ),
  };
};

/**
 * Parse and validate a common local-inference JSON record. Only the known
 * safe fields are copied into the result — extra keys on the input (raw
 * commands, credentials, hostnames, paths) are never read, so they cannot
 * reach a caller through this function regardless of what the input holds.
 * Throws before returning anything on any invalid, missing, or duplicate
 * field.
 */
export const parseComparisonFile = (input: unknown): ComparisonFile => {
  const obj = asRecord(input);
  if (obj === undefined) {
    throw new Error("comparison file must be a JSON object");
  }
  if (obj.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(
      `unsupported schemaVersion: ${JSON.stringify(obj.schemaVersion)}`,
    );
  }
  if (typeof obj.fixture !== "boolean") {
    throw new Error("fixture must be a boolean");
  }
  if (!Array.isArray(obj.runs)) {
    throw new Error("runs must be an array");
  }

  const seenIds = new Set<string>();
  const runs = obj.runs.map((run, index) => parseRun(run, index, seenIds));

  return { schemaVersion: SCHEMA_VERSION, fixture: obj.fixture, runs };
};
