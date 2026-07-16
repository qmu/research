import type { DeepResearchProvider } from "../../deep-research/domain/types";
import type { DeepResearchClient } from "./types";

/**
 * Real deep-research client factory.
 *
 * The keyless SKELETON deliberately implements only the fixture path (see
 * `fixture.ts`). Wiring each provider's real agentic endpoint behind this port —
 * OpenAI Responses (`o3-deep-research`), Perplexity's OpenAI-compatible
 * `sonar-deep-research`, Gemini's background Interactions API, Grok DeepSearch's
 * tool calls, and the Anthropic `web_search` loop — is the follow-on mission
 * ticket `#deep-research-subject-vendors.md`, gated behind the proposal-first
 * approval. Until then a real run surfaces this as a clear per-subject error
 * (recorded as an `error` provenance row) rather than faking numbers.
 */
export const createRealDeepResearchClient = (
  provider: DeepResearchProvider,
  apiModelId: string,
  _apiKey: string,
): DeepResearchClient => {
  throw new Error(
    `real ${provider} deep-research client (${apiModelId}) is not yet implemented — ` +
      "see mission ticket #deep-research-subject-vendors.md (gated on proposal approval)",
  );
};
