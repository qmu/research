import type { Task, Grade } from "./types";

// Lowercase, trim, and collapse internal whitespace so trivial formatting
// differences do not count as wrong answers.
const normalize = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, " ");

// An answer is correct when, after normalization, it contains the expected
// string. Lenient on purpose: models often wrap the answer in a sentence.
export const gradeAnswer = (task: Task, output: string): Grade => ({
  id: task.id,
  expected: task.expected,
  output,
  correct: normalize(output).includes(normalize(task.expected)),
});
