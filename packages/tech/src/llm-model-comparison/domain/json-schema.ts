// JSON-schema complexity probe: the runner drives the provider's dedicated
// structured-output feature with a generated schema and ADAPTIVELY escalates two
// independent axes — nesting depth (at breadth 1) and field breadth (at depth 1)
// — recording the maximum value on each axis for which the model still returns
// schema-conforming output. A fixed short ladder measures its own ceiling, not
// the model's; this escalation climbs geometrically (doubling) until the model
// stops conforming or the provider rejects the schema, then bisects (a bounded
// number of steps) to pin the tested maximum, up to a hard probe cap.
//
// Everything here is pure: a schema generator, the per-axis escalation state
// machine, a prompt builder, and a conformance grader. The structured-output
// *call* is a vendor concern; the grading rule and the escalation policy live
// here so they are identical across providers and unit-tested without a network
// call.

import type { SchemaAxisParams, SchemaComplexity } from "./types";

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

// The per-axis escalation state machine. Pure: the runner makes the structured
// call for `next`, grades conformance, and feeds the verdict back into
// `advanceAxis` until `next` is null. `maxConforming` is then the TESTED maximum
// on the axis (0 = the model never conformed at all). Two phases:
//
//  1. Climb — double from `start` until a probe fails (the bracket) or the cap
//     conforms (probe ceiling reached; the true ceiling may be higher).
//  2. Refine — bisect inside (maxConforming, failedAt), spending at most
//     `refinesLeft` probes, so the reported max is exact-or-conservative:
//     always a value the model actually conformed at.
export type AxisProbeState = Readonly<{
  cap: number;
  maxConforming: number; // highest value that conformed so far
  failedAt: number | null; // lowest value that failed (null while climbing)
  next: number | null; // next value to probe; null = axis done
  refinesLeft: number;
}>;

export const startAxisProbe = (
  axis: SchemaAxisParams,
  refineSteps: number,
): AxisProbeState => {
  const cap = Math.max(1, Math.floor(axis.cap));
  const start = Math.min(Math.max(1, Math.floor(axis.start)), cap);
  return {
    cap,
    maxConforming: 0,
    failedAt: null,
    next: start,
    refinesLeft: Math.max(0, Math.floor(refineSteps)),
  };
};

const bisect = (
  state: AxisProbeState,
  lo: number,
  hi: number,
): AxisProbeState => {
  if (state.refinesLeft <= 0 || hi - lo <= 1) {
    return { ...state, maxConforming: lo, failedAt: hi, next: null };
  }
  return {
    ...state,
    maxConforming: lo,
    failedAt: hi,
    next: Math.floor((lo + hi) / 2),
    refinesLeft: state.refinesLeft - 1,
  };
};

export const advanceAxis = (
  state: AxisProbeState,
  conformed: boolean,
): AxisProbeState => {
  const probed = state.next;
  if (probed === null) {
    return state;
  }
  if (conformed) {
    if (state.failedAt === null) {
      // Still climbing. Conforming at the cap ends the axis (ceiling reached);
      // otherwise double, clamped to the cap.
      if (probed >= state.cap) {
        return { ...state, maxConforming: probed, next: null };
      }
      return {
        ...state,
        maxConforming: probed,
        next: Math.min(probed * 2, state.cap),
      };
    }
    return bisect(state, probed, state.failedAt);
  }
  return bisect(state, state.maxConforming, probed);
};

// --- instrument-v2 axis search: warm-startable, exact, no refine budget -------
//
// The v1 machine above climbs geometrically from `start` every run — wasteful
// when the previous run already measured the boundary. This machine finds the
// exact boundary with the fewest probes given an optional prior:
//
//  - no prior: probe the cap (1 call answers "unbounded up to cap"), then
//    binary-search [0, cap) — ≤ 1 + log2(cap) probes, exact.
//  - prior p: probe p (confirm), then p+1 (bracket). A stable model finishes in
//    2 probes. If p+1 conforms the model improved — check the cap and bisect
//    (p+1, cap); if p fails the model regressed — bisect (0, p).
//
// Exactness holds because bisection only stops when hi - lo <= 1, and the
// reported max is always a value the model actually conformed at.
export type WarmAxisState = Readonly<{
  cap: number;
  lo: number; // highest conforming value so far (0 = none yet)
  hi: number | null; // lowest failing value so far (null = none yet)
  next: number | null; // next value to probe; null = axis done
  phase: "confirm" | "increment" | "cap" | "bisect" | "done";
}>;

export const startWarmAxisProbe = (
  prior: number | undefined,
  cap: number,
): WarmAxisState => {
  const ceiling = Math.max(1, Math.floor(cap));
  const p =
    prior === undefined ? undefined : Math.floor(Math.min(prior, ceiling));
  if (p === undefined || p < 1) {
    return { cap: ceiling, lo: 0, hi: null, next: ceiling, phase: "cap" };
  }
  if (p >= ceiling) {
    return { cap: ceiling, lo: 0, hi: null, next: ceiling, phase: "cap" };
  }
  return { cap: ceiling, lo: 0, hi: null, next: p, phase: "confirm" };
};

const warmBisect = (
  state: WarmAxisState,
  lo: number,
  hi: number,
): WarmAxisState =>
  hi - lo <= 1
    ? { ...state, lo, hi, next: null, phase: "done" }
    : {
        ...state,
        lo,
        hi,
        next: Math.floor((lo + hi) / 2),
        phase: "bisect",
      };

// Exhaustive per-phase transition table: one handler per phase, so adding a
// phase forces a compile error here instead of falling into a default arm.
const WARM_AXIS_TRANSITIONS: Readonly<
  Record<
    WarmAxisState["phase"],
    (state: WarmAxisState, probed: number, conformed: boolean) => WarmAxisState
  >
> = {
  confirm: (state, probed, conformed) =>
    conformed
      ? probed + 1 >= state.cap
        ? { ...state, lo: probed, next: state.cap, phase: "cap" }
        : { ...state, lo: probed, next: probed + 1, phase: "increment" }
      : warmBisect(state, 0, probed),
  increment: (state, probed, conformed) =>
    conformed
      ? { ...state, lo: probed, next: state.cap, phase: "cap" }
      : { ...state, hi: probed, next: null, phase: "done" },
  cap: (state, probed, conformed) =>
    conformed
      ? { ...state, lo: state.cap, next: null, phase: "done" }
      : warmBisect(state, state.lo, probed),
  bisect: (state, probed, conformed) =>
    conformed
      ? warmBisect(state, probed, state.hi ?? state.cap)
      : warmBisect(state, state.lo, probed),
  done: (state) => state,
};

export const advanceWarmAxis = (
  state: WarmAxisState,
  conformed: boolean,
): WarmAxisState => {
  const probed = state.next;
  if (probed === null) return state;
  return WARM_AXIS_TRANSITIONS[state.phase](state, probed, conformed);
};

// Instruct the model to return a JSON object conforming to a schema of the given
// shape. Under structured-output mode the schema is enforced by the provider;
// the prompt only supplies content to fill it — values are kept to one or two
// words so wide schemas stay within the output-token budget.
export const buildSchemaPrompt = (c: SchemaComplexity): string =>
  `Produce a JSON object that conforms to the provided schema: an object nested ` +
  `${c.depth} level(s) deep, each level containing ${c.breadth} string field(s) ` +
  `(and, above the deepest level, a nested "child" object). Fill every string ` +
  `field with a one-or-two-word value.`;

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
