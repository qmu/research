// Anti-corruption layer contract for large language model providers. The domain
// depends only on this shape, never on a provider SDK — so a model can be
// swapped without touching benchmark logic.

export type LlmClient = Readonly<{
  model: string;
  generateAnswer: (prompt: string) => Promise<string>;
}>;
