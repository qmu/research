// Nested-JSON structural-depth probe. Pure functions: a prompt builder, a depth
// measurer, and a single-target grader. The runner sweeps a depth ladder and
// folds the per-depth results into the deepest valid response — the grader itself
// stays referentially transparent (one target in, one verdict out).

export type NestedJsonGrade = Readonly<{
  parsed: boolean;
  achievedDepth: number;
  success: boolean;
}>;

// Ask the model to return only a JSON object nested exactly `targetDepth` levels
// deep. The instruction is explicit so the response is gradeable without prose.
export const buildNestedJsonPrompt = (targetDepth: number): string =>
  `Return ONLY a single JSON object nested exactly ${targetDepth} levels deep, ` +
  `with no surrounding text, no markdown, and no code fences. Each level must be ` +
  `an object whose sole key is "child" except the deepest level, whose value is ` +
  `the string "leaf". For example, depth 2 is {"child":{"child":"leaf"}}. ` +
  `Produce depth ${targetDepth}.`;

// Maximum object/array nesting depth of a parsed JSON value. A scalar is depth 0;
// an object or array adds one level above its deepest member.
export const jsonDepth = (value: unknown): number => {
  if (Array.isArray(value)) {
    return 1 + value.reduce((max, item) => Math.max(max, jsonDepth(item)), 0);
  }
  if (value !== null && typeof value === "object") {
    return (
      1 +
      Object.values(value).reduce(
        (max: number, item) => Math.max(max, jsonDepth(item)),
        0,
      )
    );
  }
  return 0;
};

// Extract the first balanced JSON object/array from arbitrary text and parse it.
// Models sometimes wrap the answer in fences or a sentence despite instructions;
// this recovers the structure without counting wrapping prose as failure.
const extractJson = (text: string): unknown => {
  const trimmed = text.trim();
  const start = trimmed.search(/[[{]/);
  if (start === -1) {
    return undefined;
  }
  const open = trimmed[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = start; i < trimmed.length; i += 1) {
    if (trimmed[i] === open) depth += 1;
    else if (trimmed[i] === close) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(trimmed.slice(start, i + 1));
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
};

// Grade a single response against one target depth. Success requires a parseable
// structure whose measured depth meets or exceeds the target — a model that
// nests deeper than asked has still demonstrated at least the target depth.
export const gradeNestedJson = (
  target: number,
  text: string,
): NestedJsonGrade => {
  const value = extractJson(text);
  if (value === undefined) {
    return { parsed: false, achievedDepth: 0, success: false };
  }
  const achievedDepth = jsonDepth(value);
  return { parsed: true, achievedDepth, success: achievedDepth >= target };
};
