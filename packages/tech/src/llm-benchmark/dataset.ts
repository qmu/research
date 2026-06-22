import type { Task } from "./domain/types";

// A tiny, deterministic exact-match task set. Each prompt asks for a single
// short answer so grading is unambiguous. Keep answers stable facts.
export const TASKS: ReadonlyArray<Task> = [
  {
    id: "capital-france",
    prompt: "What is the capital of France? Answer with only the city name.",
    expected: "Paris",
  },
  {
    id: "capital-japan",
    prompt: "What is the capital of Japan? Answer with only the city name.",
    expected: "Tokyo",
  },
  {
    id: "arithmetic-sum",
    prompt: "What is 17 + 25? Answer with only the number.",
    expected: "42",
  },
  {
    id: "chemical-water",
    prompt:
      "What is the chemical formula for water? Answer with only the formula.",
    expected: "H2O",
  },
  {
    id: "planet-largest",
    prompt:
      "What is the largest planet in the Solar System? Answer with only the planet name.",
    expected: "Jupiter",
  },
];
