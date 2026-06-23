import type { CompletionClient, LlmClient } from "./types";

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

// Build a JSON object nested exactly `depth` levels deep, matching the shape the
// nested-JSON prompt asks for: each level is {"child": ...} and the deepest value
// is "leaf".
const buildNestedJson = (depth: number): string => {
  let value = '"leaf"';
  for (let i = 0; i < depth; i += 1) {
    value = `{"child":${value}}`;
  }
  return value;
};

// A deterministic CompletionClient for the comparison pipeline's keyless path.
// It produces a plausible response for each probe shape so the full pipeline and
// report run with no credentials. The runner flags every row built from this
// client as `measured: false`, so the numbers here are never presented as live —
// they only exercise the graders.
export const createFixtureCompletionClient = (
  model = "fixture",
): CompletionClient => ({
  model,
  complete: (prompt: string) =>
    Promise.resolve(buildFixtureCompletion(prompt, model)),
});

const buildFixtureCompletion = (
  prompt: string,
  model: string,
): { text: string; outputTokens: number; elapsedMs: number; model: string } => {
  const text = fixtureText(prompt);
  return {
    text,
    // A nonzero count keeps the speed derivation well-formed; the row is flagged
    // not-measured regardless, so this is never read as a live figure.
    outputTokens: Math.max(1, text.split(/\s+/).length),
    elapsedMs: 1,
    model,
  };
};

const fixtureText = (prompt: string): string => {
  const depthMatch = prompt.match(/exactly (\d+) levels deep/);
  if (depthMatch) {
    return buildNestedJson(Number(depthMatch[1]));
  }
  const wordMatch = prompt.match(/exactly (\d+) words/);
  if (wordMatch) {
    return Array.from({ length: Number(wordMatch[1]) }, () => "word").join(" ");
  }
  return "";
};
