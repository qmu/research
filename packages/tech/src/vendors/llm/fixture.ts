import type { CompletionClient, Completion, LlmClient } from "./types";

// A deterministic client that returns canned answers keyed by prompt. It calls
// no API, so it runs in CI without credentials or cost. Used for the pipeline
// self-test and for unit tests. (Seed benchmark contract — untouched.)
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
//
// It is a pure function of (prompt, seed): the SAME seed reproduces byte-identical
// output, and DIFFERENT seeds vary the output in a small, bounded way. The runner
// passes the trial index as the seed, so a multi-trial fixture run produces a real
// (non-degenerate) yet perfectly reproducible distribution — exercising the
// multi-trial aggregation and statistics without any API, key, or cost. Every row
// built from this client is flagged `fixtured`, so these numbers are never
// presented as live; they only exercise the pipeline.
export const createFixtureCompletionClient = (
  model = "fixture",
  seed = 0,
): CompletionClient => ({
  model,
  complete: (prompt: string): Promise<Completion> =>
    Promise.resolve(buildFixtureCompletion(prompt, model, seed)),
});

const buildFixtureCompletion = (
  prompt: string,
  model: string,
  seed: number,
): Completion => {
  const text = fixtureText(prompt, seed);
  // Deterministic-but-seed-varying timing so tokensPerSecond has real spread
  // across trials while staying byte-stable for a given seed.
  const outputTokens = Math.max(1, Math.ceil(text.length / 4));
  const elapsedMs = 8 + (seed % 5) * 2 + (text.length % 3);
  return { text, outputTokens, elapsedMs, model };
};

// Produce a plausible response for each probe shape, perturbed by `seed`:
//  - nested-JSON: even seeds nest to any requested depth; odd seeds cap at depth
//    12, so the deepest ladder rung (16) fails on odd trials — giving the
//    max-depth metric a real, reproducible spread across trials.
//  - length: the word count is the target plus a bounded jitter in {-1, 0, +1}
//    keyed on the seed, so length-accuracy varies slightly across trials.
const fixtureText = (prompt: string, seed: number): string => {
  const depthMatch = prompt.match(/exactly (\d+) levels deep/);
  if (depthMatch) {
    const target = Number(depthMatch[1]);
    const cap = seed % 2 === 0 ? target : Math.min(target, 12);
    return buildNestedJson(cap);
  }
  const wordMatch = prompt.match(/exactly (\d+) words/);
  if (wordMatch) {
    const target = Number(wordMatch[1]);
    const jitter = (seed % 3) - 1; // -1, 0, or +1
    const count = Math.max(1, target + jitter);
    return Array.from({ length: count }, () => "word").join(" ");
  }
  return "";
};
