---
created_at: 2026-07-06T15:52:33+09:00
author: a@qmu.jp
type: enhancement
layer: [Domain, Infrastructure, Config]
effort: 4h
commit_hash:
category: Added
depends_on:
---

# Add coding-agent-optimized models (OpenAI Codex + xAI grok-code-fast-1) to the comparison

## Overview

The LLM comparison sweeps a curated matrix of **general** frontier/flagship/mid/small
models. It has no coding-agent-optimized model. This adds the two that are
genuinely distinct and reachable, scored on the **existing generic probes** (no
coding-specific probe — see Design decisions):

1. **OpenAI Codex** (`gpt-5.3-codex`, and optionally `codex-mini`) — the `-codex`
   line is **Responses-API-first** (`/v1/responses`), which the benchmark does NOT
   speak today (its OpenAI adapter is Chat-Completions-only). So Codex requires a
   new API surface: an `api: "responses"` value + a sibling `openai-responses.ts`
   adapter. Reuses `OPENAI_API_KEY` and the already-installed `openai` SDK.
2. **xAI `grok-code-fast-1`** — a purpose-built agentic-coding model on an
   **OpenAI-compatible** API (`https://api.x.ai/v1`, Chat Completions). Needs a new
   `xai` provider tag + `XAI_API_KEY` + a **base-URL variant** of the OpenAI
   adapter. **Key-gated:** there is no `XAI_API_KEY` in `packages/tech/.env` yet, so
   this phase is deferred until the owner supplies the key (the keyless fixture
   path still exercises it; a real measurement waits for the key).

Research finding recorded for the record (answers the request's second question):
**Google has no coding-specialized model** — coding is served by the general
`gemini-3.5-flash` ("optimized for agentic and coding") and `gemini-3.1-pro`,
already in the matrix; Antigravity/Jules are agent *harnesses*, not scoreable base
models. **Anthropic** likewise has no separate coding model — Claude Opus 4.8 /
Sonnet 5 (already in the matrix) are the coding tier. So **nothing is added for
Google or Anthropic**; this ticket is OpenAI-Codex + xAI only.

## Design decisions (per owner, 2026-07-06)

1. **Score coding models on the SAME generic probes** (throughput / latency /
   JSON-schema depth-breadth / length-accuracy) as every other model — "just line
   them up like the others to see." **No coding-correctness probe** in scope now
   (owner explicitly declined scoring "by the coding viewpoint"). If a code-gen
   probe is ever wanted it is a separate ticket.
2. **Add Codex + xAI grok-code-fast-1** (not the full cross-provider coding panel
   — Mistral Devstral / Qwen-Coder / DeepSeek-Coder remain out of scope pending
   their own keys, consistent with the registry's existing cross-provider note).
3. **Codex reuses the OpenAI key/SDK via a new Responses adapter; xAI reuses the
   OpenAI SDK via a base-URL variant** — no genuinely new SDK dependency for either.

## Policies

- `workaholic:design` + `workaholic:implementation` / `vendor-neutrality.md` —
  central. The Responses API and the xAI base-URL both stay behind `vendors/llm/`
  as thin, domain-named adapters; provider/wire specifics never leak into
  `domain/`. Codex needs **no** dependency-decision entry (same `openai` SDK,
  different endpoint); **xAI reuses the `openai` SDK with a base URL, so also no new
  dependency** — but add a one-line note to `docs/dependency-decisions.md` recording
  that the OpenAI SDK now also fronts the xAI OpenAI-compatible endpoint.
- `workaholic:implementation` / `objective-documentation.md` — any effort a coding
  model rejects, or a Responses model that lacks JSON-schema structured output,
  stays flagged (`error` / `n/a` / ">= cap"), never faked. `compare:fixture` stays
  byte-stable and deterministic.
- ADR `docs/adr/0004-research-topic-anatomy.md` — the `vendors/<provider>/` ACL,
  thin-entrypoint wiring, and curated-registry-vs-measured split with a provenance
  flag are the pattern to follow (the `api: "realtime"` card is the precedent for a
  non-default API surface).

## Key Files

- `packages/tech/src/llm-model-comparison/domain/types.ts` — widen the `api` union
  (`types.ts:32`) to add `"responses"`; widen the `Provider` union (`types.ts:19`)
  to add `"xai"`. Update both doc comments.
- `packages/tech/src/vendors/llm/openai-responses.ts` (**new**) —
  `createOpenAiResponsesCompletionClient(apiModelId, apiKey)`, implementing the
  `CompletionClient` port (`vendors/llm/types.ts:84-99`) via `client.responses.create`
  (map effort → `reasoning.effort`; structured output → Responses `text.format`
  json_schema; stream for TTFT). Mirrors `openai.ts` but hits `/v1/responses`.
- `packages/tech/src/vendors/llm/openai.ts` — extract a base-URL-parameterized
  factory (e.g. `createOpenAiCompatibleCompletionClient(apiModelId, apiKey, baseURL)`)
  so xAI reuses the Chat-Completions adapter against `https://api.x.ai/v1`; keep
  `createOpenAiCompletionClient` as the default-base-URL wrapper.
- `packages/tech/src/entrypoints/run-llm-model-comparison.ts` — the dispatch seam:
  add `ENV_KEY.xai = "XAI_API_KEY"` (`:97`), a `CLIENT_FACTORY.xai` entry (`:103`)
  bound to the base-URL variant, and an `if (card.api === "responses")` branch in
  `buildLiveClient` (`:119`, mirroring the `realtime` branch) before the
  `CLIENT_FACTORY[provider]` fallthrough.
- `packages/tech/src/llm-model-comparison/models.ts` — new `ModelCard`s: OpenAI
  `gpt-5.3-codex` (`provider:"openai"`, `api:"responses"`, effort
  `["low","medium","high","xhigh"]`, cited source) and optionally `codex-mini`; xAI
  `grok-code-fast-1` (`provider:"xai"`, default chat api, effort per its docs or
  `["n/a"]` if none, cited source). Verify exact wire ids + pricing against the
  cited pages at implementation time.
- `packages/tech/src/vendors/llm/fixture.ts` — ensure the fixture path covers the
  new cards deterministically (the keyless CI path must render them).
- `docs/dependency-decisions.md` — one-line note: OpenAI SDK now also fronts the
  xAI OpenAI-compatible endpoint (no new dependency).
- `docs/research-reports/llm-model-comparison.{md,data.json}` — regenerate the
  committed **fixture** baseline via `compare:fixture` so it includes the new cards
  and stays byte-stable.

## Implementation Steps

Phase A (Codex) is doable now with the existing OpenAI key; Phase B (xAI) is
key-gated.

1. **Widen the unions (Domain).** `api += "responses"`, `Provider += "xai"`, with
   updated doc comments. tsc drives out every switch/site that must handle the new
   values.

2. **Responses-API adapter (Phase A core).** New `openai-responses.ts` implementing
   `CompletionClient` against `client.responses.create`. Map: effort →
   `reasoning.effort`; structured probe → Responses json-schema (`text.format`);
   throughput/latency via the streamed Responses events for TTFT. Confine all wire
   shape to this file (double-cast per the ACL). If the Responses surface has no
   usable JSON-schema structured mode for the codex model, record schema depth/
   breadth honestly as the realtime card does (0/0), not faked.

3. **xAI base-URL adapter (Phase B, key-gated).** Refactor `openai.ts` to expose a
   base-URL-parameterized factory; add the `xai` `ENV_KEY` + `CLIENT_FACTORY`
   entries pointing at `https://api.x.ai/v1`. No new SDK.

4. **Dispatch + registry.** Add the `api === "responses"` branch in `buildLiveClient`;
   add the three `ModelCard`s (Codex, optional codex-mini, grok-code-fast-1) with
   cited sources and verified wire ids/pricing/effort levels.

5. **Regenerate + verify.** `compare:fixture` ×2 byte-identical with the new cards;
   then a **real targeted run** to prove the live paths measure without error:
   `compare -- --configs openai-gpt-5-3-codex:high` (Codex, with the OpenAI key) →
   `measured`, not `error`. Defer the xAI real run until `XAI_API_KEY` exists;
   `--only-errored` later fills it.

## Considerations

- **Responses API shape risk.** The `-codex` models are Responses-first and the SDK
  surface (`client.responses`) differs from Chat Completions in request/stream
  shape; budget the adapter time here. Confirm the chosen codex id still exists and
  its exact effort set at implementation time — OpenAI rotates codex naming and
  flags some `-codex` ids for deprecation.
- **xAI is key-gated.** With no `XAI_API_KEY`, the xAI card measures via the fixture
  path only; it will show `fixtured` (or `error` if a live client is attempted
  without a key) until the owner supplies the key — honest, not a bug. Do not block
  Phase A on Phase B.
- **Apples-to-apples caveat (documented, not fixed).** Per the owner, coding models
  are scored on generic probes only, so the report must NOT imply these numbers
  measure coding skill — they measure the same speed/structure/instruction-following
  as every other row. A one-line report/method note keeps that honest.
- **Matrix growth is cheap** (registry-only for xAI; +1 API surface for Codex) and
  follows the multimodel-engine precedent of growing within thin ACLs.

## Quality Gate

- `gpt-5.3-codex` (and any codex-mini) appears in the matrix and **measures live via
  the Responses adapter with provenance `measured`, 0 errors**, verified by a real
  `--configs openai-...-codex:<effort>` run using the existing `OPENAI_API_KEY`.
- `grok-code-fast-1` is wired (union + adapter + registry) and renders on the
  keyless fixture path; its live measurement is explicitly deferred to when
  `XAI_API_KEY` exists and is not a blocker for shipping Phase A.
- No coding-specific probe is added; the new models are scored on the existing
  four generic probes exactly like every other card.
- Every non-measured cell stays honestly flagged (`fixtured` / `error` / `n/a` /
  ">= cap"); the report does not present coding-model numbers as coding-skill
  measurements.
- `compare:fixture` ×2 byte-identical (regenerated to include the new cards);
  `npm test` (tsc + vitest, incl. any new adapter unit tests), `npm run lint`, and
  `make build` all green; `docs/dependency-decisions.md` updated for the xAI base-URL
  reuse.
