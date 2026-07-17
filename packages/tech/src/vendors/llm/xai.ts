import OpenAI from "openai";
import type {
  CompletionClient,
  GroundedAnswer,
  GroundedAnswerClient,
  GroundedCitation,
  ImageGenerationClient,
} from "./types";
import {
  createOpenAiCompatibleCompletionClient,
  createOpenAiCompatibleImageGenerationClient,
} from "./openai";
import { openAiResponsesOutputTokens } from "./usage";

// xAI's API is OpenAI-compatible (the Chat Completions protocol) served at a
// different base URL, so its whole Grok lineup (grok-4.3, the 4.20 reasoning/
// non-reasoning pair, and the grok-build coding model) is reached through the
// OpenAI adapter with only the base URL swapped. The single xAI-specific fact — the
// base URL — is kept behind this thin wrapper, never in `domain/` or the entrypoint.
// Reuses the installed `openai` SDK; no new dependency is taken on (see
// docs/dependency-decisions.md).
const XAI_BASE_URL = "https://api.x.ai/v1";

export const createXaiCompletionClient = (
  apiModelId: string,
  apiKey: string,
): CompletionClient =>
  createOpenAiCompatibleCompletionClient(apiModelId, apiKey, XAI_BASE_URL);

// Grok Imagine speaks the OpenAI Images protocol at the same base URL, so the
// image-generation port is the OpenAI adapter with the URL swapped, like the
// completion client above. Dialect: xAI rejects the `size` argument
// (400 "Argument not supported: size", observed on the 2026-07-17 first real
// trial) and returns a URL unless `response_format: "b64_json"` is requested,
// so both dialect switches differ from OpenAI's defaults here.
export const createXaiImageGenerationClient = (
  apiModelId: string,
  apiKey: string,
): ImageGenerationClient =>
  createOpenAiCompatibleImageGenerationClient(
    apiModelId,
    apiKey,
    XAI_BASE_URL,
    {
      includeSize: false,
      requestB64Json: true,
    },
  );

// ── Agent Tools (grounded answers for the trend-recency topic) ────────────────

const CITED_ANSWER_SYSTEM_PROMPT =
  "Answer the question concisely and factually, and cite the sources you used.";

// Live Search — the `search_parameters` extension on Chat Completions this topic
// was first wired to — is RETIRED. The 2026-07-17 first real trial got
// `410 "Live search is deprecated. Please switch to the Agent Tools API"` on
// every grounded Grok call, so the whole row was an error row. Agent Tools is the
// replacement surface: the OpenAI-compatible Responses protocol at
// `${XAI_BASE_URL}/responses` with a built-in `web_search` tool, which the
// installed `openai` SDK reaches with only the base URL swapped — the same
// no-new-dependency pattern as the completion/image clients above (see
// docs/dependency-decisions.md).
//
// Wire facts, from the xAI docs read 2026-07-17
// (https://docs.x.ai/developers/tools/overview, .../tools/web-search,
// .../tools/citations):
//   - request: `{ model, input: [{ role, content }], tools: [{ type: "web_search" }] }`
//   - response: Responses-shaped `output[]` items whose `output_text` content
//     parts carry the answer, plus a top-level `citations` list of URL STRINGS
//     ("always returned by default"), and inline `url_citation` annotations.
// Only documented request fields are sent: this provider answers an unsupported
// argument with a hard 400, not a finding (it already rejects `size` on the image
// surface), and the owner-gated live probe is too expensive to spend on a guess.

// One `url_citation` annotation's `title` is the VISIBLE CITATION NUMBER ("1",
// "2"), not a source title — so annotations contribute their URL only. The
// top-level `citations` list is documented as URL strings; dated
// `{ url, title, date }` objects are read defensively as a plausible wire
// evolution and supersede a bare URL for the same source, the same convention as
// the Perplexity ACL. Pure and exported so it is unit-tested without a network
// call.
export const extractXaiCitations = (raw: {
  citations?: unknown;
  output?: unknown;
}): GroundedCitation[] => {
  const byUrl = new Map<string, GroundedCitation>();
  const addBareUrl = (url: string): void => {
    if (url.length > 0 && !byUrl.has(url)) byUrl.set(url, { url });
  };

  if (Array.isArray(raw.citations)) {
    for (const entry of raw.citations) {
      if (typeof entry === "string") {
        addBareUrl(entry);
        continue;
      }
      if (entry === null || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const url = typeof record.url === "string" ? record.url : undefined;
      if (url === undefined) continue;
      const title = typeof record.title === "string" ? record.title : undefined;
      const date = typeof record.date === "string" ? record.date : undefined;
      byUrl.set(url, {
        url,
        ...(title === undefined ? {} : { title }),
        ...(date === undefined ? {} : { publishedDateIso: date }),
      });
    }
  }

  for (const annotation of urlCitationAnnotations(raw.output)) {
    addBareUrl(annotation);
  }
  return [...byUrl.values()];
};

// Walk the Responses `output[]` array defensively — item and content-part shapes
// vary with tool use — collecting inline `url_citation` annotation URLs.
const urlCitationAnnotations = (output: unknown): ReadonlyArray<string> => {
  if (!Array.isArray(output)) return [];
  const urls: string[] = [];
  for (const item of output) {
    const content = (item as { content?: unknown } | null)?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      const annotations = (part as { annotations?: unknown } | null)
        ?.annotations;
      if (!Array.isArray(annotations)) continue;
      for (const annotation of annotations) {
        if (annotation === null || typeof annotation !== "object") continue;
        const record = annotation as Record<string, unknown>;
        if (record.type !== "url_citation") continue;
        if (typeof record.url === "string") urls.push(record.url);
      }
    }
  }
  return urls;
};

// The answer text: `output_text` when the surface provides the aggregated
// convenience field, else the concatenated `output_text` content parts of the
// output items. Pure and exported so it is unit-tested without a network call.
export const extractXaiAgentText = (raw: {
  output_text?: unknown;
  output?: unknown;
}): string => {
  if (typeof raw.output_text === "string" && raw.output_text.length > 0) {
    return raw.output_text;
  }
  if (!Array.isArray(raw.output)) return "";
  const parts: string[] = [];
  for (const item of raw.output) {
    const content = (item as { content?: unknown } | null)?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part === null || typeof part !== "object") continue;
      const record = part as Record<string, unknown>;
      if (record.type !== "output_text") continue;
      if (typeof record.text === "string") parts.push(record.text);
    }
  }
  return parts.join("");
};

// Grounded-answer client for the trend-recency topic: one question in, one cited
// answer out, with the built-in `web_search` tool enabled. `citations` is an xAI
// extension the installed OpenAI SDK types do not cover, and the SDK's Responses
// param type does not name xAI's tool; the casts keep that wire shape confined to
// this adapter. Parameters follow the current Agent Tools documentation — the
// LIVE verification of this migration is still owed (the 410 above is what the
// first trial verified), and until an owner runs the gated single-subject probe
// this row stays unmeasured rather than assumed working.
export const createXaiGroundedClient = (
  apiModelId: string,
  apiKey: string,
): GroundedAnswerClient => {
  const client = new OpenAI({ apiKey, baseURL: XAI_BASE_URL });
  type CreateParams = Parameters<typeof client.responses.create>[0];
  return {
    model: apiModelId,
    answer: async (question: string): Promise<GroundedAnswer> => {
      const startedAt = Date.now();
      const response = (await client.responses.create({
        model: apiModelId,
        input: [
          { role: "system", content: CITED_ANSWER_SYSTEM_PROMPT },
          { role: "user", content: question },
        ],
        tools: [{ type: "web_search" }],
      } as unknown as CreateParams)) as unknown as {
        output_text?: unknown;
        output?: unknown;
        citations?: unknown;
        usage?: { output_tokens?: unknown };
      };
      return {
        answer: extractXaiAgentText(response),
        citations: extractXaiCitations(response),
        outputTokens: openAiResponsesOutputTokens(response.usage),
        elapsedMs: Date.now() - startedAt,
        model: apiModelId,
      };
    },
  };
};
