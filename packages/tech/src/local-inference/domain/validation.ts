/** Versioned interchange format. Null metrics always carry a machine-readable gap. */
export const gapReasons = [
  "NO-FIELD",
  "NOT-STATED",
  "NOT-EXPOSED",
  "NOT-LOADABLE",
  "NOT-COMPARABLE",
  "NOT-RUN",
] as const;
type GapReason = (typeof gapReasons)[number];
export type Metric =
  { value: number; reason?: never } | { value: null; reason: GapReason };
export interface InferenceRow {
  id: string;
  backend: string;
  model: string;
  quantization: string;
  hardware: string;
  condition: string;
  speed: Metric;
  quality: Metric;
}
export interface InferenceReport {
  schemaVersion: 1;
  fixture: boolean;
  runs: InferenceRow[];
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object");
  }
  return value as Record<string, unknown>;
}
function metric(value: unknown, name: string): Metric {
  const data = object(value);
  if (data.value === null && gapReasons.includes(data.reason as GapReason)) {
    return { value: null, reason: data.reason as GapReason };
  }
  if (
    typeof data.value === "number" &&
    Number.isFinite(data.value) &&
    data.value >= 0 &&
    (name !== "quality" || data.value <= 1) &&
    data.reason === undefined
  ) {
    return { value: data.value };
  }
  throw new Error(
    `Invalid ${name}: use a nonnegative finite value or null with a gap reason`,
  );
}

export function parseInferenceReport(value: unknown): InferenceReport {
  const data = object(value);
  if (
    data.schemaVersion !== 1 ||
    typeof data.fixture !== "boolean" ||
    !Array.isArray(data.runs)
  ) {
    throw new Error("Expected schemaVersion 1, fixture boolean and runs array");
  }
  const ids = new Set<string>();
  const runs = data.runs.map((value): InferenceRow => {
    const row = object(value);
    const text = (key: string): string => {
      const field = row[key];
      if (typeof field !== "string" || !field.trim())
        throw new Error(`Missing ${key}`);
      return field;
    };
    const id = text("id");
    if (ids.has(id)) throw new Error(`Duplicate run id: ${id}`);
    ids.add(id);
    return {
      id,
      backend: text("backend"),
      model: text("model"),
      quantization: text("quantization"),
      hardware: text("hardware"),
      condition: text("condition"),
      speed: metric(row.speed, "speed"),
      quality: metric(row.quality, "quality"),
    };
  });
  return { schemaVersion: 1, fixture: data.fixture, runs };
}
