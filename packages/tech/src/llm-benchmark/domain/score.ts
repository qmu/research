import type { Grade, BenchmarkResult } from "./types";

// Aggregate per-task grades into an overall accuracy result.
export const summarize = (
  model: string,
  grades: ReadonlyArray<Grade>,
): BenchmarkResult => {
  const total = grades.length;
  const correct = grades.filter((grade) => grade.correct).length;
  return {
    model,
    total,
    correct,
    accuracy: total === 0 ? 0 : correct / total,
    grades,
  };
};
