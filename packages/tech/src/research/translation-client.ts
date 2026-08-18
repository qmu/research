import {
  TRANSLATION_API_MODEL_ID,
  TRANSLATION_OUTPUT_TOKENS,
} from "./domain/translate";
import type { LlmClient } from "../vendors/llm/types";
import { createFixtureTranslationClient } from "../vendors/llm/fixture";
import { createAnthropicCompletionClient } from "../vendors/llm/anthropic";

export const TRANSLATION_KEY_ENV = "ANTHROPIC_API_KEY";

export type TranslationClientOptions = Readonly<{
  /**
   * The page this run is about to overwrite. Named in the refusal, because the
   * cost of getting this wrong is a published page replaced by a stub.
   */
  target: string;
  /**
   * Deliberate opt-in to the deterministic stub — the entrypoints' `--fixture`.
   * Absent, a missing key refuses instead of silently substituting.
   */
  allowFixture: boolean;
}>;

/**
 * Select the translation client for a run that WILL WRITE a page.
 *
 * Both translation runners used to fork on the key alone and fall back to
 * `createFixtureTranslationClient()`, whose single-line stub then replaced the
 * topic's published Japanese page. Nothing caught it: the stub echoes every
 * number it finds so the domain's numeric-preservation check reports no miss,
 * and the only other signal was node's routine `.env not found` line. So the
 * documented command destroyed a real page whenever it ran without a key — by a
 * routine, by CI, or by a developer with no `.env`.
 *
 * The stub stays reachable, because CI and the fixture path need it; what
 * changes is that selecting it is now something a caller ASKS for. Pricing
 * (`--estimate`) never reaches here — it needs no client and stays keyless.
 */
export const selectTranslationClient = (
  options: TranslationClientOptions,
): LlmClient => {
  const key = process.env[TRANSLATION_KEY_ENV];
  if (key === undefined || key === "") {
    if (!options.allowFixture) {
      throw new Error(
        `${TRANSLATION_KEY_ENV} is not set, so the live translation cannot run. ` +
          `Refusing to overwrite ${options.target} with the deterministic fixture stub. ` +
          `Set ${TRANSLATION_KEY_ENV} (or put it in packages/tech/.env), ` +
          `pass --estimate to price the live call without writing, ` +
          `or pass --fixture to write the stub deliberately.`,
      );
    }
    return createFixtureTranslationClient();
  }
  const completion = createAnthropicCompletionClient(
    TRANSLATION_API_MODEL_ID,
    key,
  );
  return {
    model: completion.model,
    generateAnswer: (prompt) =>
      completion
        .complete(prompt, { maxTokens: TRANSLATION_OUTPUT_TOKENS })
        .then((result) => result.text),
  };
};
