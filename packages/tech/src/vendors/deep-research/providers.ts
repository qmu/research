import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import type { DeepResearchProvider } from "../../deep-research/domain/types";
import { extractAnthropicWebSearchCitations } from "../llm/anthropic";
import { extractOpenAiUrlCitations } from "../llm/openai-responses";
import { extractPerplexityCitations } from "../llm/perplexity";
import { extractXaiAgentText, extractXaiCitations } from "../llm/xai";
import {
  DEEP_RESEARCH_PRICING,
  computeDeepResearchCostUsd,
  type ProviderPricing,
} from "./pricing";
import type { Citation, DeepResearchAnswer, DeepResearchClient } from "./types";

/**
 * Real deep-research client factory. Each provider's differently-shaped agentic
 * endpoint is normalized to the one `DeepResearchClient` port so the benchmark
 * domain never branches on provider:
 *
 *  - OpenAI  — Responses API `o3-deep-research`, web search always-on.
 *  - Perplexity — OpenAI-compatible `sonar-deep-research` chat endpoint.
 *  - Gemini  — the GA **Interactions API** deep-research agent (background,
 *    polled to completion).
 *  - Grok    — Responses-shaped Agent Tools (`web_search`) at the xAI base URL.
 *  - Anthropic — the transparent build-your-own baseline: Messages + the
 *    server-side `web_search` tool over an agentic loop.
 *
 * The citation EXTRACTORS are the same pure functions the trend-recency grounded
 * clients already unit-test, reused here so citation parsing has one tested home
 * per provider. Cost is derived from each call's billed usage via the pure
 * `pricing` helper; when a provider does not report enough usage to price a call,
 * the client falls back to the card's curated reference midpoint (`fallbackCostUsd`)
 * rather than reporting a false $0. `elapsedMs` is measured around the whole call
 * (including Gemini's poll loop). Report text is returned in memory for judging
 * and never committed.
 *
 * The first real trial is the live verification of this wiring; per-subject error
 * isolation in the runner turns any provider-shape surprise into an honest `error`
 * row, never a fabricated number.
 */

const SYSTEM_INSTRUCTION =
  "Research the question thoroughly using web sources and write a well-structured, " +
  "factual report. Cite every substantive claim with the sources you used.";

// Deep-research queries run for minutes; the provider SDKs default to a short
// request timeout, so widen it and disable retries (a retried multi-minute
// research call would double-bill).
const LONG_TIMEOUT_MS = 20 * 60 * 1_000;

const num = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;

// ── shared cost/answer assembly ──────────────────────────────────────────────

type RawUsage = Readonly<{
  inputTokens: number;
  outputTokens: number;
  searchCount?: number;
}>;

const assembleAnswer = (
  model: string,
  report: string,
  citations: ReadonlyArray<Citation>,
  elapsedMs: number,
  usage: RawUsage,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchAnswer => {
  const computed = computeDeepResearchCostUsd(pricing, usage);
  // No billed tokens read (a shape we could not parse) → use the curated
  // reference midpoint rather than a false $0.
  const costUsd =
    usage.inputTokens === 0 && usage.outputTokens === 0
      ? fallbackCostUsd
      : computed;
  return {
    report,
    citations,
    elapsedMs,
    costUsd,
    ...(usage.searchCount === undefined
      ? {}
      : { searchCount: usage.searchCount }),
    model,
  };
};

const toCitations = (
  grounded: ReadonlyArray<{ url: string; title?: string }>,
): ReadonlyArray<Citation> =>
  grounded.map((citation) => ({
    url: citation.url,
    ...(citation.title === undefined ? {} : { title: citation.title }),
  }));

// ── OpenAI o3-deep-research (Responses API) ───────────────────────────────────

// Deep-research models require a data-source tool; `web_search_preview` is the
// hosted web search the Responses deep-research models run against. The response
// carries the report as `output_text`, `url_citation` annotations for sources,
// and `web_search_call` items whose count is the search surcharge driver.
const openAiSearchCount = (output: unknown): number => {
  if (!Array.isArray(output)) return 0;
  return output.filter(
    (item) =>
      item !== null &&
      typeof item === "object" &&
      (item as { type?: unknown }).type === "web_search_call",
  ).length;
};

const createOpenAiDeepResearchClient = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchClient => {
  // A sync Responses deep-research call runs for minutes and is prone to a
  // transient edge 520 (observed on the 2026-07-19 first trial: "520 status
  // code (no body)"). A 520 means the origin response never returned, so a
  // bounded retry is safe against double-billing; the fuller fix (background
  // mode + poll, like Gemini) is a follow-up.
  const client = new OpenAI({
    apiKey,
    timeout: LONG_TIMEOUT_MS,
    maxRetries: 2,
  });
  type CreateParams = Parameters<typeof client.responses.create>[0];
  return {
    model: apiModelId,
    research: async (question): Promise<DeepResearchAnswer> => {
      const startedAt = Date.now();
      const response = (await client.responses.create({
        model: apiModelId,
        instructions: SYSTEM_INSTRUCTION,
        input: question,
        tools: [{ type: "web_search_preview" }],
      } as unknown as CreateParams)) as unknown as {
        output_text?: string;
        output?: unknown;
        usage?: { input_tokens?: unknown; output_tokens?: unknown };
      };
      return assembleAnswer(
        apiModelId,
        response.output_text ?? "",
        toCitations(extractOpenAiUrlCitations(response.output)),
        Date.now() - startedAt,
        {
          inputTokens: num(response.usage?.input_tokens),
          outputTokens: num(response.usage?.output_tokens),
          searchCount: openAiSearchCount(response.output),
        },
        pricing,
        fallbackCostUsd,
      );
    },
  };
};

// ── Perplexity sonar-deep-research (OpenAI-compatible chat) ───────────────────

const PERPLEXITY_BASE_URL = "https://api.perplexity.ai";

const createPerplexityDeepResearchClient = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchClient => {
  const client = new OpenAI({
    apiKey,
    baseURL: PERPLEXITY_BASE_URL,
    timeout: LONG_TIMEOUT_MS,
    maxRetries: 0,
  });
  return {
    model: apiModelId,
    research: async (question): Promise<DeepResearchAnswer> => {
      const startedAt = Date.now();
      const response = await client.chat.completions.create({
        model: apiModelId,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: question },
        ],
      } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
      // `citations` / `search_results` / `num_search_queries` are Perplexity
      // extensions the SDK types do not cover; the cast confines them here.
      const raw = response as unknown as {
        citations?: unknown;
        search_results?: unknown;
        usage?: {
          prompt_tokens?: unknown;
          completion_tokens?: unknown;
          num_search_queries?: unknown;
        };
      };
      const searchCount = num(raw.usage?.num_search_queries);
      return assembleAnswer(
        apiModelId,
        response.choices[0]?.message?.content ?? "",
        toCitations(extractPerplexityCitations(raw)),
        Date.now() - startedAt,
        {
          inputTokens: num(raw.usage?.prompt_tokens),
          outputTokens: num(raw.usage?.completion_tokens),
          ...(searchCount === 0 ? {} : { searchCount }),
        },
        pricing,
        fallbackCostUsd,
      );
    },
  };
};

// ── Gemini Deep Research (Interactions API, background + poll) ─────────────────

const GEMINI_POLL_INTERVAL_MS = 10_000;
const GEMINI_MAX_WAIT_MS = 20 * 60 * 1_000;

// Walk the interaction's model_output steps: concatenate their text content for
// the report, and collect `url_citation` annotation URLs for citations. The
// shapes are read defensively — a background agent interleaves thought, search,
// and output steps — so a shape surprise yields empty rather than throwing.
const geminiReportAndCitations = (
  steps: unknown,
): Readonly<{ report: string; citations: ReadonlyArray<Citation> }> => {
  const texts: string[] = [];
  const byUrl = new Map<string, Citation>();
  if (!Array.isArray(steps)) return { report: "", citations: [] };
  for (const step of steps) {
    if (step === null || typeof step !== "object") continue;
    if ((step as { type?: unknown }).type !== "model_output") continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part === null || typeof part !== "object") continue;
      const record = part as Record<string, unknown>;
      if (record.type === "text" && typeof record.text === "string") {
        texts.push(record.text);
      }
      const annotations = record.annotations;
      if (!Array.isArray(annotations)) continue;
      for (const annotation of annotations) {
        if (annotation === null || typeof annotation !== "object") continue;
        const ann = annotation as Record<string, unknown>;
        if (ann.type !== "url_citation") continue;
        const url = typeof ann.url === "string" ? ann.url : undefined;
        if (url === undefined || byUrl.has(url)) continue;
        const title = typeof ann.title === "string" ? ann.title : undefined;
        byUrl.set(url, { url, ...(title === undefined ? {} : { title }) });
      }
    }
  }
  return { report: texts.join("\n\n"), citations: [...byUrl.values()] };
};

const geminiSearchCount = (usage: unknown): number => {
  const counts = (usage as { grounding_tool_count?: unknown } | undefined)
    ?.grounding_tool_count;
  if (!Array.isArray(counts)) return 0;
  return counts.reduce(
    (sum, entry) => sum + num((entry as { count?: unknown } | null)?.count),
    0,
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((done) => setTimeout(done, ms));

const createGeminiDeepResearchClient = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchClient => {
  const client = new GoogleGenAI({ apiKey });
  type CreateParams = Parameters<typeof client.interactions.create>[0];
  return {
    model: apiModelId,
    research: async (question): Promise<DeepResearchAnswer> => {
      const startedAt = Date.now();
      // The Interactions deep-research agent rejects `system_instruction`
      // (verified live: 400 "The 'system_instruction' parameter is not
      // supported" on the 2026-07-19 first trial), so the instruction is folded
      // into the input text instead.
      const created = (await client.interactions.create({
        agent: apiModelId,
        input: `${SYSTEM_INSTRUCTION}\n\n${question}`,
        background: true,
        agent_config: { type: "deep-research" },
      } as unknown as CreateParams)) as unknown as {
        id: string;
        status: string;
      };
      let interaction: { status: string; steps?: unknown; usage?: unknown } =
        created;
      while (
        interaction.status === "in_progress" ||
        interaction.status === "requires_action"
      ) {
        if (Date.now() - startedAt > GEMINI_MAX_WAIT_MS) {
          throw new Error(
            `gemini deep-research interaction ${created.id} did not complete within ${GEMINI_MAX_WAIT_MS}ms (last status ${interaction.status})`,
          );
        }
        await sleep(GEMINI_POLL_INTERVAL_MS);
        interaction = (await client.interactions.get(
          created.id,
        )) as unknown as { status: string; steps?: unknown; usage?: unknown };
      }
      if (interaction.status !== "completed") {
        throw new Error(
          `gemini deep-research interaction ${created.id} ended with status ${interaction.status}`,
        );
      }
      const { report, citations } = geminiReportAndCitations(interaction.steps);
      const usage = interaction.usage as
        | { total_input_tokens?: unknown; total_output_tokens?: unknown }
        | undefined;
      return assembleAnswer(
        apiModelId,
        report,
        citations,
        Date.now() - startedAt,
        {
          inputTokens: num(usage?.total_input_tokens),
          outputTokens: num(usage?.total_output_tokens),
          searchCount: geminiSearchCount(interaction.usage),
        },
        pricing,
        fallbackCostUsd,
      );
    },
  };
};

// ── Grok DeepSearch (Agent Tools over the Responses protocol) ─────────────────

const XAI_BASE_URL = "https://api.x.ai/v1";

const createGrokDeepResearchClient = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchClient => {
  const client = new OpenAI({
    apiKey,
    baseURL: XAI_BASE_URL,
    timeout: LONG_TIMEOUT_MS,
    maxRetries: 0,
  });
  type CreateParams = Parameters<typeof client.responses.create>[0];
  return {
    model: apiModelId,
    research: async (question): Promise<DeepResearchAnswer> => {
      const startedAt = Date.now();
      const response = (await client.responses.create({
        model: apiModelId,
        input: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: question },
        ],
        tools: [{ type: "web_search" }],
      } as unknown as CreateParams)) as unknown as {
        output_text?: unknown;
        output?: unknown;
        citations?: unknown;
        usage?: { input_tokens?: unknown; output_tokens?: unknown };
      };
      return assembleAnswer(
        apiModelId,
        extractXaiAgentText(response),
        toCitations(extractXaiCitations(response)),
        Date.now() - startedAt,
        {
          inputTokens: num(response.usage?.input_tokens),
          outputTokens: num(response.usage?.output_tokens),
        },
        pricing,
        fallbackCostUsd,
      );
    },
  };
};

// ── Anthropic build-your-own baseline (Messages + web_search loop) ─────────────

// The transparent DIY reference: Claude with the server-side web_search tool over
// a self-orchestrated loop. `max_uses` bounds the per-report search surcharge but
// is generous (a deep-research task fans out many searches). The billed search
// count is `usage.server_tool_use.web_search_requests`.
const anthropicSearchCount = (usage: unknown): number =>
  num(
    (usage as { server_tool_use?: { web_search_requests?: unknown } } | null)
      ?.server_tool_use?.web_search_requests,
  );

const createAnthropicDeepResearchClient = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
): DeepResearchClient => {
  const client = new Anthropic({
    apiKey,
    timeout: LONG_TIMEOUT_MS,
    maxRetries: 0,
  });
  return {
    model: apiModelId,
    research: async (question): Promise<DeepResearchAnswer> => {
      const startedAt = Date.now();
      const response = await client.messages.create({
        model: apiModelId,
        max_tokens: 8_192,
        system: SYSTEM_INSTRUCTION,
        messages: [{ role: "user", content: question }],
        tools: [
          { type: "web_search_20250305", name: "web_search", max_uses: 10 },
        ],
      } as unknown as Anthropic.Messages.MessageCreateParamsNonStreaming);
      const report = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("");
      const usage = response.usage as unknown as {
        input_tokens?: unknown;
        output_tokens?: unknown;
      };
      return assembleAnswer(
        apiModelId,
        report,
        toCitations(extractAnthropicWebSearchCitations(response.content)),
        Date.now() - startedAt,
        {
          inputTokens: num(usage.input_tokens),
          outputTokens: num(usage.output_tokens),
          searchCount: anthropicSearchCount(response.usage),
        },
        pricing,
        fallbackCostUsd,
      );
    },
  };
};

// A Record over the provider union (not a switch) so adding a provider is a
// compile error until its factory is registered here — the repo's exhaustive-
// union convention.
type DeepResearchClientFactory = (
  apiModelId: string,
  apiKey: string,
  pricing: ProviderPricing,
  fallbackCostUsd: number,
) => DeepResearchClient;

const FACTORY_BY_PROVIDER: Record<
  DeepResearchProvider,
  DeepResearchClientFactory
> = {
  openai: createOpenAiDeepResearchClient,
  perplexity: createPerplexityDeepResearchClient,
  google: createGeminiDeepResearchClient,
  xai: createGrokDeepResearchClient,
  anthropic: createAnthropicDeepResearchClient,
};

export const createRealDeepResearchClient = (
  provider: DeepResearchProvider,
  apiModelId: string,
  apiKey: string,
  fallbackCostUsd: number,
): DeepResearchClient =>
  FACTORY_BY_PROVIDER[provider](
    apiModelId,
    apiKey,
    DEEP_RESEARCH_PRICING[provider],
    fallbackCostUsd,
  );
