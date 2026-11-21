import { describe, expect, it } from "vitest";
import { runLlmBenchmark } from "./run";
import { TASKS } from "./dataset";

describe("runLlmBenchmark (fixture dry-run)", () => {
  it("grades every task against the deterministic fixture client", async () => {
    const result = await runLlmBenchmark({ fixture: true });
    expect(result.model).toBe("fixture");
    expect(result.total).toBe(TASKS.length);
    expect(result.correct).toBe(TASKS.length);
    expect(result.accuracy).toBe(1);
    expect(result.grades.map((grade) => grade.id)).toEqual(
      TASKS.map((task) => task.id),
    );
  });

  it("needs no credentials and calls no external API", async () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await runLlmBenchmark({ fixture: true });
      expect(result.correct).toBe(TASKS.length);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });

  it("produces a byte-stable result from the same input across repeated runs", async () => {
    const a = await runLlmBenchmark({ fixture: true });
    const b = await runLlmBenchmark({ fixture: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
