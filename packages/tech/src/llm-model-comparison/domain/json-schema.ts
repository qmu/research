// JSON-schema complexity probe. Replaces the old "ask for nested JSON in prose
// and grade the text" approach: the runner drives the provider's dedicated
// structured-output feature with a generated schema, escalating complexity along
// BOTH nesting depth AND field breadth, and records the maximum complexity the
// model actually returns schema-conforming output for — the tested affordance,
// not the paper spec.
//
// Everything here is pure: a schema generator, an escalation ladder, a prompt
// builder, and a conformance grader. The structured-output *call* is a vendor
// concern; the grading rule lives here so it is identical across providers and
// unit-tested without a network call.

import type { SchemaComplexity } from "./types";

// A generated JSON schema is a plain object; the vendor port accepts it as a
// provider-neutral `JsonSchema` (a readonly record) without the domain importing
// any vendor type.
export type GeneratedSchema = Record<string, unknown>;

const fieldName = (i: number): string => `field${i}`;

// Build a schema object nested `depth` levels deep, each level carrying `breadth`
// scalar string fields plus (above the deepest level) a nested `child` object.
// Only structured-output-safe constructs are used: `type`, `properties`,
// `required`, and `additionalProperties: false` — no numeric/string constraints,
// which several providers reject.
export const buildSchema = (c: SchemaComplexity): GeneratedSchema => {
  const depth = Math.max(1, Math.floor(c.depth));
  const breadth = Math.max(0, Math.floor(c.breadth));

  const level = (remaining: number): GeneratedSchema => {
    const properties: Record<string, unknown> = {};
    for (let i = 0; i < breadth; i += 1) {
      properties[fieldName(i)] = { type: "string" };
    }
    if (remaining > 1) {
      properties.child = level(remaining - 1);
    }
    return {
      type: "object",
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
  };

  return level(depth);
};

// An escalation ladder of `count` rungs that grows complexity along both axes,
// alternating a breadth step and a depth step so neither dimension is favored.
// Starts small so even weak models clear the first rungs.
export const escalatingLadder = (
  count: number,
): ReadonlyArray<SchemaComplexity> => {
  const rungs: SchemaComplexity[] = [];
  let depth = 1;
  let breadth = 2;
  for (let i = 0; i < Math.max(0, Math.floor(count)); i += 1) {
    rungs.push({ depth, breadth });
    if (i % 2 === 0) {
      breadth += 2;
    } else {
      depth += 1;
    }
  }
  return rungs;
};

// Instruct the model to return a JSON object conforming to a schema of the given
// shape. Under structured-output mode the schema is enforced by the provider;
// the prompt only supplies realistic content to fill it.
export const buildSchemaPrompt = (c: SchemaComplexity): string =>
  `Produce a JSON object that conforms to the provided schema: an object nested ` +
  `${c.depth} level(s) deep, each level containing ${c.breadth} string field(s) ` +
  `(and, above the deepest level, a nested "child" object). Fill every string ` +
  `field with a short, plausible value.`;

// Extract the first balanced JSON object/array from arbitrary text and parse it.
// Structured-output responses are usually clean JSON, but this recovers the value
// even when a provider wraps it in prose or fences.
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

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// Validate a parsed value against a generated schema. Structural rule: an object
// must contain exactly its required keys (nothing missing, and — because
// `additionalProperties` is false — nothing extra), and each field must match its
// declared scalar type or nested object schema. Referentially transparent.
const matches = (value: unknown, schema: GeneratedSchema): boolean => {
  const type = schema.type;
  if (type === "string") return typeof value === "string";
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return typeof value === "number";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "object") {
    if (!isPlainObject(value)) return false;
    const properties = (schema.properties ?? {}) as Record<
      string,
      GeneratedSchema
    >;
    const required = (schema.required ?? []) as ReadonlyArray<string>;
    const keys = Object.keys(value);
    if (keys.length !== required.length) return false; // no missing / no extra
    return required.every(
      (key) => key in value && matches(value[key], properties[key]),
    );
  }
  return false;
};

// The verdict of a structured-output call at one complexity rung: the parsed
// value (or null when nothing parseable came back) and whether it conforms to the
// requested schema. The runner escalates the ladder and records the highest
// conforming rung as the model's tested max schema complexity.
export type ConformanceGrade = Readonly<{
  value: unknown;
  conforms: boolean;
}>;

export const gradeConformance = (
  schema: GeneratedSchema,
  raw: string,
): ConformanceGrade => {
  const value = extractJson(raw);
  if (value === undefined) {
    return { value: null, conforms: false };
  }
  return { value, conforms: matches(value, schema) };
};
