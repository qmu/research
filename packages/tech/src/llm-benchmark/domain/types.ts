// Pure domain types for the exact-match LLM benchmark. No vendor or entrypoint
// types appear here — this module depends on nothing external.

export type Task = Readonly<{
  id: string;
  prompt: string;
  expected: string;
}>;

export type Grade = Readonly<{
  id: string;
  expected: string;
  output: string;
  correct: boolean;
}>;

export type BenchmarkResult = Readonly<{
  model: string;
  total: number;
  correct: number;
  accuracy: number; // 0..1
  grades: ReadonlyArray<Grade>;
}>;
