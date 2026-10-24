import { describe, expect, it, vi } from "vitest";
import {
  FIXTURE_GENERATED_AT,
  resolveGeneratedAt,
  runLlmBenchmark,
} from "./run";
import { renderReport } from "./domain/report";
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

  it("renders a byte-identical report across runs and wall-clock time", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2030-05-05T00:00:00Z"));
      const a = renderReport(
        await runLlmBenchmark({ fixture: true }),
        resolveGeneratedAt(true),
      );
      vi.setSystemTime(new Date("2031-06-06T12:34:56Z"));
      const b = renderReport(
        await runLlmBenchmark({ fixture: true }),
        resolveGeneratedAt(true),
      );
      expect(b).toBe(a);
      expect(a).toContain(FIXTURE_GENERATED_AT);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stamps the real clock only off the fixture path", () => {
    expect(resolveGeneratedAt(false)).not.toBe(FIXTURE_GENERATED_AT);
  });

  it("keeps JSON key order fixed", async () => {
    const result = await runLlmBenchmark({ fixture: true });
    expect(Object.keys(result)).toEqual([
      "model",
      "total",
      "correct",
      "accuracy",
      "grades",
    ]);
  });

  it("produces a byte-stable result from the same input across repeated runs", async () => {
    const a = await runLlmBenchmark({ fixture: true });
    const b = await runLlmBenchmark({ fixture: true });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
