import type { LlmClient } from "./types";

// A deterministic client that returns canned answers keyed by prompt. It calls
// no API, so it runs in CI without credentials or cost. Used for the pipeline
// self-test and for unit tests.
export const createFixtureClient = (
  answers: ReadonlyMap<string, string>,
): LlmClient => ({
  model: "fixture",
  generateAnswer: (prompt: string): Promise<string> =>
    Promise.resolve(answers.get(prompt) ?? ""),
});
