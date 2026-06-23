import { describe, it, expect } from "vitest";
import {
  buildNestedJsonPrompt,
  jsonDepth,
  gradeNestedJson,
} from "./nested-json";

describe("buildNestedJsonPrompt", () => {
  it("names the requested depth", () => {
    expect(buildNestedJsonPrompt(5)).toContain("5 levels deep");
  });
});

describe("jsonDepth", () => {
  it("treats a scalar as depth 0", () => {
    expect(jsonDepth("leaf")).toBe(0);
    expect(jsonDepth(42)).toBe(0);
    expect(jsonDepth(null)).toBe(0);
  });

  it("counts a flat object as depth 1", () => {
    expect(jsonDepth({ child: "leaf" })).toBe(1);
  });

  it("counts nested objects", () => {
    expect(jsonDepth({ child: { child: "leaf" } })).toBe(2);
  });

  it("counts nested arrays", () => {
    expect(jsonDepth([[["leaf"]]])).toBe(3);
  });

  it("counts the deepest branch of a mixed structure", () => {
    expect(jsonDepth({ a: "leaf", b: { c: { d: "leaf" } } })).toBe(3);
  });
});

describe("gradeNestedJson", () => {
  it("succeeds when the response meets the target depth", () => {
    const grade = gradeNestedJson(2, '{"child":{"child":"leaf"}}');
    expect(grade).toEqual({ parsed: true, achievedDepth: 2, success: true });
  });

  it("succeeds when the response is deeper than asked", () => {
    const grade = gradeNestedJson(2, '{"child":{"child":{"child":"leaf"}}}');
    expect(grade.success).toBe(true);
    expect(grade.achievedDepth).toBe(3);
  });

  it("fails when the response is too shallow", () => {
    const grade = gradeNestedJson(3, '{"child":"leaf"}');
    expect(grade).toEqual({ parsed: true, achievedDepth: 1, success: false });
  });

  it("recovers JSON wrapped in prose or fences", () => {
    const grade = gradeNestedJson(
      2,
      'Here you go:\n```json\n{"child":{"child":"leaf"}}\n```',
    );
    expect(grade).toEqual({ parsed: true, achievedDepth: 2, success: true });
  });

  it("fails on unparseable text", () => {
    const grade = gradeNestedJson(2, "no json here");
    expect(grade).toEqual({ parsed: false, achievedDepth: 0, success: false });
  });
});
