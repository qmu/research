import type {
  FieldScore,
  FieldSpec,
  MetricStat,
  StructuredFieldScore,
} from "./types";

export const normalizeOcrText = (value: string): string =>
  value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

const normalizeWhitespace = (value: string): string =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

const normalizeFieldValue = (
  value: string,
  normalization: string | undefined,
): string => {
  const base = normalizeWhitespace(value);
  if (normalization === "decimal-string") {
    const numeric = base.replace(/,/g, "");
    const valueNumber = Number(numeric);
    return Number.isFinite(valueNumber) ? valueNumber.toFixed(2) : numeric;
  }
  if (normalization === "iso-date") {
    return base.replace(/\//g, "-");
  }
  if (
    normalization === "uppercase-trim" ||
    normalization === "uppercase-collapse-space"
  ) {
    return base.toUpperCase();
  }
  return base;
};

export const editDistance = (
  expected: ReadonlyArray<string>,
  actual: ReadonlyArray<string>,
): number => {
  const previous = Array.from({ length: actual.length + 1 }, (_, i) => i);
  for (let i = 1; i <= expected.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= actual.length; j += 1) {
      const substitutionCost = expected[i - 1] === actual[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + substitutionCost,
      );
    }
    for (let j = 0; j < previous.length; j += 1) {
      previous[j] = current[j] ?? 0;
    }
  }
  return previous[actual.length] ?? 0;
};

const rate = (distance: number, referenceLength: number): number =>
  referenceLength === 0 ? (distance === 0 ? 0 : 1) : distance / referenceLength;

export const characterErrorRate = (
  reference: string,
  candidate: string,
): number => {
  const expected = Array.from(normalizeOcrText(reference));
  const actual = Array.from(normalizeOcrText(candidate));
  return rate(editDistance(expected, actual), expected.length);
};

const words = (value: string): ReadonlyArray<string> => {
  const normalized = normalizeOcrText(value);
  return normalized === "" ? [] : normalized.split(/\s+/);
};

export const wordErrorRate = (reference: string, candidate: string): number => {
  const expected = words(reference);
  const actual = words(candidate);
  return rate(editDistance(expected, actual), expected.length);
};

export const scoreStructuredFields = (
  expected: Readonly<Record<string, string>>,
  actual: Readonly<Record<string, unknown>>,
  schema: ReadonlyArray<FieldSpec>,
): StructuredFieldScore => {
  const fields: FieldScore[] = schema.map((field) => {
    const expectedValue = expected[field.name] ?? "";
    const rawActual = actual[field.name];
    const actualValue =
      typeof rawActual === "string" || typeof rawActual === "number"
        ? String(rawActual)
        : undefined;
    const normalizedExpected = normalizeFieldValue(
      expectedValue,
      field.normalization,
    );
    const normalizedActual =
      actualValue === undefined
        ? undefined
        : normalizeFieldValue(actualValue, field.normalization);
    return {
      field: field.name,
      expected: expectedValue,
      actual: actualValue,
      normalizedExpected,
      normalizedActual,
      correct: normalizedActual === normalizedExpected,
    };
  });
  const correct = fields.filter((field) => field.correct).length;
  return {
    accuracy: fields.length === 0 ? 1 : correct / fields.length,
    correct,
    total: fields.length,
    fields,
  };
};

export const summarizeStats = (values: ReadonlyArray<number>): MetricStat => {
  if (values.length === 0) {
    return { mean: 0, stdDev: 0, n: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.length < 2
      ? 0
      : values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        (values.length - 1);
  return { mean, stdDev: Math.sqrt(variance), n: values.length };
};
