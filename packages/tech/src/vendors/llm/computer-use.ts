import type { ComputerUseClient } from "./types";

// Anti-corruption adapters for the three API-native computer-use tools, all
// behind the single provider-neutral `ComputerUseClient` port. Each vendor loop
// (Anthropic `computer_20251124`, OpenAI Responses `computer`, Google
// `computer_use`) drives the SAME fixed Playwright harness — observe (screenshot
// + accessibility snapshot) → the model returns an action → the harness actuates
// it → repeat — and evaluates the task's declarative success predicate against
// the live DOM at the end.
//
// That harness loop is the gated real-trial follow-up (guideline step 3,
// owner-triggered within the $40/trial ceiling): it needs a real browser and a
// provider key and therefore cannot run on the keyless CI path. Until it lands,
// these factories construct honestly but refuse to fabricate a trajectory — a
// real run surfaces the refusal as an `error` provenance row rather than a faked
// `measured` number, exactly as the image-generation topic records a provider
// that errors. The keyless fixture client (`createFixtureComputerUseClient`)
// exercises the scoring pipeline in the meantime.

const HARNESS_PENDING = (provider: string, apiModelId: string): Error =>
  new Error(
    `real ${provider} computer-use runs require the Playwright harness loop ` +
      `(gated real-trial follow-up); ${apiModelId} has no keyless real path yet`,
  );

const pendingClient = (
  provider: string,
  apiModelId: string,
): ComputerUseClient => ({
  model: apiModelId,
  attemptTask: () => Promise.reject(HARNESS_PENDING(provider, apiModelId)),
});

// Anthropic Computer Use — the `computer_20251124` tool on a Claude model, via
// the Messages API sampling loop (`toolVersion` selects the beta tool string).
export const createAnthropicComputerUseClient = (
  apiModelId: string,
  _apiKey: string,
  _toolVersion: string,
): ComputerUseClient => pendingClient("anthropic", apiModelId);

// OpenAI computer use — the built-in `computer` tool on the Responses API.
export const createOpenAiComputerUseClient = (
  apiModelId: string,
  _apiKey: string,
): ComputerUseClient => pendingClient("openai", apiModelId);

// Google Gemini computer use — the `computer_use` tool (browser environment) on
// the Gemini API.
export const createGoogleComputerUseClient = (
  apiModelId: string,
  _apiKey: string,
): ComputerUseClient => pendingClient("google", apiModelId);
