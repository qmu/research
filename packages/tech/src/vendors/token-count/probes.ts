import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { FamilyCard } from "../../token-metering/domain/types";
import type {
  ApiCountProbe,
  ApiCountReading,
  ProbeFactory,
} from "../../token-metering/run";
import { OPENAI_OUTPUT_COST_PER_MTOK } from "../../token-metering/models";

/**
 * Ground-truth probes: one per family, each returning the provider-reported
 * token count for a single-user-message request plus what the reading itself
 * cost. Anthropic and Google expose unbilled count endpoints; OpenAI and the
 * Workers-AI-hosted OSS model report prompt tokens only in a billed
 * completion's usage field, so those probes clamp the completion as small as
 * the API allows and account the spend from the reported usage.
 */

export const createAnthropicCountProbe = (
  apiModelId: string,
  apiKey: string,
): ApiCountProbe => {
  const client = new Anthropic({ apiKey });
  return async (text: string): Promise<ApiCountReading> => {
    const response = await client.messages.countTokens({
      model: apiModelId,
      messages: [{ role: "user", content: text }],
    });
    return { tokens: response.input_tokens, costUsd: 0 };
  };
};

export const createGoogleCountProbe = (
  apiModelId: string,
  apiKey: string,
): ApiCountProbe => {
  const client = new GoogleGenAI({ apiKey });
  return async (text: string): Promise<ApiCountReading> => {
    const response = await client.models.countTokens({
      model: apiModelId,
      contents: text,
    });
    const tokens = response.totalTokens;
    if (typeof tokens !== "number") {
      throw new Error("countTokens returned no totalTokens");
    }
    return { tokens, costUsd: 0 };
  };
};

export const createOpenAiUsageProbe = (
  apiModelId: string,
  apiKey: string,
  inputCostPerMTok: number,
): ApiCountProbe => {
  const client = new OpenAI({ apiKey });
  return async (text: string): Promise<ApiCountReading> => {
    const response = await client.chat.completions.create({
      model: apiModelId,
      messages: [{ role: "user", content: text }],
      // The smallest completion the reasoning models accept; prompt_tokens is
      // reported regardless of how the completion ends.
      max_completion_tokens: 16,
    });
    const usage = response.usage;
    if (usage === undefined || usage === null) {
      throw new Error("completion returned no usage");
    }
    const costUsd =
      (usage.prompt_tokens * inputCostPerMTok) / 1_000_000 +
      (usage.completion_tokens * OPENAI_OUTPUT_COST_PER_MTOK) / 1_000_000;
    return { tokens: usage.prompt_tokens, costUsd };
  };
};

type WorkersAiUsage = Readonly<{
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
}>;

export const createWorkersAiUsageProbe = (
  apiModelId: string,
  accountId: string,
  apiToken: string,
  inputCostPerMTok: number,
): ApiCountProbe => {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  return async (text: string): Promise<ApiCountReading> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: apiModelId,
        messages: [{ role: "user", content: text }],
        max_tokens: 1,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `workers-ai completion failed: ${response.status} ${(await response.text()).slice(0, 200)}`,
      );
    }
    const body = (await response.json()) as Readonly<{
      usage?: WorkersAiUsage;
    }>;
    const promptTokens = body.usage?.prompt_tokens;
    if (typeof promptTokens !== "number") {
      throw new Error("workers-ai completion returned no usage.prompt_tokens");
    }
    const completionTokens =
      typeof body.usage?.completion_tokens === "number"
        ? body.usage.completion_tokens
        : 0;
    // Workers AI publishes an approximate per-MTok price for the model; the
    // reading is accounted at that published rate for both directions.
    const costUsd =
      ((promptTokens + completionTokens) * inputCostPerMTok) / 1_000_000;
    return { tokens: promptTokens, costUsd };
  };
};

export type ProbeCredentialGap = Readonly<{
  familyId: string;
  missing: ReadonlyArray<string>;
}>;

const REQUIRED_KEYS: Readonly<Record<string, ReadonlyArray<string>>> = {
  "anthropic-claude": ["ANTHROPIC_API_KEY"],
  "openai-gpt": ["OPENAI_API_KEY"],
  "google-gemini": ["GOOGLE_API_KEY"],
  "oss-qwen": ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
};

export const probesMissingCredentials = (
  env: NodeJS.ProcessEnv,
): ReadonlyArray<ProbeCredentialGap> =>
  Object.entries(REQUIRED_KEYS)
    .map(([familyId, keys]) => ({
      familyId,
      missing: keys.filter((key) => !env[key]),
    }))
    .filter((gap) => gap.missing.length > 0);

/** Assemble the real probe factory from whatever credentials are present;
 * families without a full credential set record `unreachable`. */
export const buildRealProbeFactory =
  (env: NodeJS.ProcessEnv): ProbeFactory =>
  (card: FamilyCard) => {
    if (card.id === "anthropic-claude" && env.ANTHROPIC_API_KEY) {
      return createAnthropicCountProbe(card.apiModelId, env.ANTHROPIC_API_KEY);
    }
    if (card.id === "openai-gpt" && env.OPENAI_API_KEY) {
      return createOpenAiUsageProbe(
        card.apiModelId,
        env.OPENAI_API_KEY,
        card.inputCostPerMTok,
      );
    }
    if (card.id === "google-gemini" && env.GOOGLE_API_KEY) {
      return createGoogleCountProbe(card.apiModelId, env.GOOGLE_API_KEY);
    }
    if (
      card.id === "oss-qwen" &&
      env.CLOUDFLARE_ACCOUNT_ID &&
      env.CLOUDFLARE_API_TOKEN
    ) {
      return createWorkersAiUsageProbe(
        card.apiModelId,
        env.CLOUDFLARE_ACCOUNT_ID,
        env.CLOUDFLARE_API_TOKEN,
        card.inputCostPerMTok,
      );
    }
    return undefined;
  };
