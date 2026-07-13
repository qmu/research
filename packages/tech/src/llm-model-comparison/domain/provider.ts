import type { Provider } from "./types";

const PROVIDER_DISPLAY_NAMES = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  perplexity: "Perplexity",
} satisfies Record<Provider, string>;

export const providerDisplayName = (provider: Provider | string): string =>
  provider in PROVIDER_DISPLAY_NAMES
    ? PROVIDER_DISPLAY_NAMES[provider as Provider]
    : provider;
