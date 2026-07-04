import { describe, it, expect } from "vitest";
import {
  buildSchema,
  buildSchemaPrompt,
  escalatingLadder,
  gradeConformance,
} from "./json-schema";

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

describe("escalatingLadder", () => {
  it("grows complexity along both axes, alternating breadth then depth", () => {
    expect(escalatingLadder(4)).toEqual([
      { depth: 1, breadth: 2 },
      { depth: 1, breadth: 4 },
      { depth: 2, breadth: 4 },
      { depth: 2, breadth: 6 },
    ]);
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
