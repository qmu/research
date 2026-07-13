import type { Citation, DeepResearchAnswer, DeepResearchClient } from "./types";

// A small fixed pool of domain-neutral source hosts. The fixture selects a
// deterministic, non-degenerate subset per question so source-diversity and
// citation-count stats are meaningful yet byte-stable on the keyless path.
const FIXTURE_HOSTS: ReadonlyArray<string> = [
  "en.wikipedia.org",
  "rfc-editor.org",
  "nature.com",
  "reuters.com",
  "arxiv.org",
];

const seedOf = (text: string): number =>
  [...text].reduce((sum, char) => (sum + char.charCodeAt(0)) % 997, 0);

/**
 * Deterministic deep-research stub for the keyless path. Every question yields a
 * short synthetic report that names the question, a deterministic set of 3–5
 * citations drawn from a fixed host pool (so diversity is non-degenerate), a
 * latency seeded from the question text, and zero cost. It bills nothing and
 * touches no network — the same keyless convention as the other topics' fixture
 * clients. The perfect-judgement fixture judge lives in the runner.
 */
export const createFixtureDeepResearchClient = (
  model = "fixture-deep-research",
): DeepResearchClient => ({
  model,
  research: (question: string): Promise<DeepResearchAnswer> => {
    const seed = seedOf(question);
    const count = 3 + (seed % 3); // 3..5 citations
    const citations: Citation[] = Array.from({ length: count }, (_, index) => {
      const host = FIXTURE_HOSTS[(seed + index) % FIXTURE_HOSTS.length] ?? "";
      return {
        url: `https://${host}/${seed}-${index}`,
        title: `Fixture source ${index + 1}`,
      };
    });
    return Promise.resolve({
      report: `Fixture deep-research report for: ${question}`,
      citations,
      elapsedMs: 1_000 + (seed % 4_000),
      costUsd: 0,
      searchCount: count * 2,
      model,
    });
  },
});
