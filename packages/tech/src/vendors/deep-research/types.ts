// Anti-corruption layer contract for autonomous "deep research" endpoints. A
// subject takes one natural-language question and returns a cited report; the
// domain depends only on this shape, never on a provider SDK, so a subject can
// be swapped without touching the benchmark logic.

export type Citation = Readonly<{
  url: string;
  title?: string;
}>;

// The normalized result of one deep-research query. The adapter measures
// `elapsedMs` around its own call and sums `costUsd` from the provider's
// reported token/tool usage, so the domain never branches on provider. Report
// text is returned in memory for judging; it is never committed to the repo.
export type DeepResearchAnswer = Readonly<{
  report: string;
  citations: ReadonlyArray<Citation>;
  elapsedMs: number;
  /** Provider-billed cost for THIS query in USD (0 on the keyless fixture). */
  costUsd: number;
  /** Web searches the endpoint performed, when the provider reports it. */
  searchCount?: number;
  model: string;
}>;

// The deep-research port. Deliberately minimal (one question in, one cited
// report out) so every provider's differently-shaped agentic API normalizes to
// the same contract and the benchmark domain stays provider-neutral.
export type DeepResearchClient = Readonly<{
  model: string;
  research: (question: string) => Promise<DeepResearchAnswer>;
}>;
