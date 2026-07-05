import { describe, it, expect } from "vitest";
import {
  advanceAxis,
  buildSchema,
  buildSchemaPrompt,
  gradeConformance,
  startAxisProbe,
} from "./json-schema";

// Drive the axis state machine to completion, feeding a conformance verdict from
// `conformsUpTo` — the model conforms for values <= this and fails above it.
const runAxis = (
  start: number,
  cap: number,
  refineSteps: number,
  conformsUpTo: number,
) => {
  let state = startAxisProbe({ start, cap }, refineSteps);
  const probed: number[] = [];
  while (state.next !== null) {
    const v = state.next;
    probed.push(v);
    state = advanceAxis(state, v <= conformsUpTo);
  }
  return { max: state.maxConforming, probed };
};

describe("buildSchema", () => {
  it("builds a flat object with `breadth` string fields at depth 1", () => {
    const schema = buildSchema({ depth: 1, breadth: 2 });
    expect(schema).toEqual({
      type: "object",
      properties: {
        field0: { type: "string" },
        field1: { type: "string" },
      },
      required: ["field0", "field1"],
      additionalProperties: false,
    });
  });

  it("nests a `child` object for each level above the deepest", () => {
    const schema = buildSchema({ depth: 2, breadth: 1 }) as Record<
      string,
      unknown
    >;
    const props = schema.properties as Record<string, unknown>;
    expect(props.child).toBeDefined();
    expect((props.child as Record<string, unknown>).type).toBe("object");
  });
});

describe("adaptive axis escalation", () => {
  it("climbs geometrically from start, then bisects to the exact tested max", () => {
    // Conforms up to 20; cap 128. Climb: 2,4,8,16,32(fail) → bracket (16,32),
    // bisect with a generous budget → pins 20 exactly.
    const { max, probed } = runAxis(2, 128, 8, 20);
    expect(probed.slice(0, 5)).toEqual([2, 4, 8, 16, 32]);
    expect(max).toBe(20);
  });

  it("reports >= cap when the model conforms all the way up", () => {
    // Conforms up to 1000 but the probe cap is 128 → climb reaches 128, conforms,
    // and the axis stops at the ceiling (the true max may be higher).
    const { max } = runAxis(2, 128, 6, 1000);
    expect(max).toBe(128);
  });

  it("reports 0 when nothing conforms at all (never afforded)", () => {
    const { max } = runAxis(2, 128, 6, 0);
    expect(max).toBe(0);
  });

  it("gives a conservative (never-overclaimed) max when the bisection budget runs out", () => {
    // True max is 100 but only 1 refine step: after the bracket (64,128) one
    // bisection probes 96 (conforms) → reports 96, never above the real max.
    const { max } = runAxis(2, 128, 1, 100);
    expect(max).toBeLessThanOrEqual(100);
    expect(max).toBe(96);
  });
});

describe("buildSchemaPrompt", () => {
  it("describes the requested depth and breadth", () => {
    const p = buildSchemaPrompt({ depth: 3, breadth: 2 });
    expect(p).toContain("3 level");
    expect(p).toContain("2 string field");
  });
});

describe("gradeConformance", () => {
  const schema = buildSchema({ depth: 2, breadth: 1 });

  it("accepts JSON that exactly matches the schema", () => {
    const raw = JSON.stringify({ field0: "a", child: { field0: "b" } });
    expect(gradeConformance(schema, raw).conforms).toBe(true);
  });

  it("rejects a missing required field", () => {
    const raw = JSON.stringify({ child: { field0: "b" } });
    expect(gradeConformance(schema, raw).conforms).toBe(false);
  });

  it("rejects an extra field (additionalProperties: false)", () => {
    const raw = JSON.stringify({
      field0: "a",
      extra: 1,
      child: { field0: "b" },
    });
    expect(gradeConformance(schema, raw).conforms).toBe(false);
  });

  it("rejects a wrong scalar type", () => {
    const raw = JSON.stringify({ field0: 123, child: { field0: "b" } });
    expect(gradeConformance(schema, raw).conforms).toBe(false);
  });

  it("returns { value: null, conforms: false } for non-JSON", () => {
    expect(gradeConformance(schema, "sorry, no JSON here")).toEqual({
      value: null,
      conforms: false,
    });
  });
});
