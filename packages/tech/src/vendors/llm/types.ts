// Anti-corruption layer contract for large language model providers. The domain
// depends only on this shape, never on a provider SDK — so a model can be
// swapped without touching benchmark logic.

export type LlmClient = Readonly<{
  model: string;
  generateAnswer: (prompt: string) => Promise<string>;
}>;

// A richer contract for the model-comparison topic, which needs token counts and
// timing that `generateAnswer` discards. Added alongside `LlmClient` (not a
// widening of it) so the seed benchmark's contract and tests are untouched and
// each topic depends only on the contract it needs.

// Provider-neutral completion options. `topic` is passed through for probes that
// need a subject; no provider-specific field appears here.
export type CompletionOptions = Readonly<{
  maxTokens?: number;
  topic?: string;
}>;

// The normalized result of one completion. The adapter measures `elapsedMs`
// around its own SDK call and normalizes each provider's differently-named
// output-token count into `outputTokens`, so the domain never branches on
// provider.
export type Completion = Readonly<{
  text: string;
  outputTokens: number;
  elapsedMs: number;
  model: string;
}>;

export type CompletionClient = Readonly<{
  model: string;
  complete: (
    prompt: string,
    options?: CompletionOptions,
  ) => Promise<Completion>;
}>;
