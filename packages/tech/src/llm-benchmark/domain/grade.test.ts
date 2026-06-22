import { describe, it, expect } from "vitest";
import { gradeAnswer } from "./grade";
import type { Task } from "./types";

const task: Task = {
  id: "t1",
  prompt: "Capital of France?",
  expected: "Paris",
};

describe("gradeAnswer", () => {
  it("marks an exact answer correct", () => {
    expect(gradeAnswer(task, "Paris").correct).toBe(true);
  });

  it("ignores case and surrounding whitespace", () => {
    expect(gradeAnswer(task, "  paris\n").correct).toBe(true);
  });

  it("accepts the expected answer embedded in a sentence", () => {
    expect(gradeAnswer(task, "The capital is Paris.").correct).toBe(true);
  });

  it("marks a wrong answer incorrect", () => {
    expect(gradeAnswer(task, "Lyon").correct).toBe(false);
  });

  it("marks an empty answer incorrect", () => {
    expect(gradeAnswer(task, "").correct).toBe(false);
  });
});
