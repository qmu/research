# 0007 — Aggregator gateway support: OpenRouter only

## Context

The **Support IaaS-hosted models** mission adds additional *backends* (transports)
for models the comparison already reasons about, behind the existing
`CompletionClient` port. Alongside the IaaS platforms (AWS Bedrock, Google Vertex)
the mission names a third category — **aggregator gateways** (OpenRouter,
Fireworks, Together, Groq, DeepInfra, …) offering "one key, one bill, and
failover" — and requires that the candidates be surveyed and a supported subset
chosen before any is built.

The mission's scope draws one line that decides this question:

> **In scope** — additional *backends* (transports) for models we already reason
> about. **Out of scope** — new *models* whose weights we don't already track
> (that's a `models.ts` change, not a backend).

## Survey (2026-07-14)

Every candidate exposes a drop-in OpenAI-compatible Chat Completions endpoint, so
each would cost about twenty lines (the `xai.ts` / `perplexity.ts` base-URL
wrapper, no new SDK). Adapter cost is therefore *not* the differentiator — what
each gateway **serves** is.

| Gateway | Base URL | What it serves | In scope? |
| --- | --- | --- | --- |
| **OpenRouter** | `https://openrouter.ai/api/v1` | A router over ~343 models **including the exact frontier models this registry already tracks** — `anthropic/claude-opus-4.8`, `openai/gpt-5.5`, `x-ai/grok-4.3`, `google/gemini-*` | **Yes** — a transport for models we already reason about |
| Groq | `https://api.groq.com/openai/v1` | Open-weight models on custom silicon (Llama, Qwen3, Kimi K2, gpt-oss) | No — none are tracked |
| Together | `https://api.together.xyz/v1` | 100+ open-weight/fine-tuned models | No — none are tracked |
| Fireworks | `https://api.fireworks.ai/inference/v1` | Open-weight models + fine-tuning | No — none are tracked |
| DeepInfra | `https://api.deepinfra.com/v1/openai` | Broad open-weight catalogue (Kimi, Qwen3.5, GLM-5, DeepSeek V4) | No — none are tracked |

Verified against OpenRouter's public `/api/v1/models` endpoint on 2026-07-14: 343
models; `anthropic/claude-opus-4.8` prices at $5 / $25 per MTok and
`openai/gpt-5.5` at $5 / $30 — **identical to those models' first-party rates**, so
OpenRouter's pricing is passthrough and a comparison against the first-party cards
isolates the transport, not the price. Note OpenRouter's own id spelling differs
from the first-party wire id (`anthropic/claude-opus-4.8`, with a dot, not
`claude-opus-4-8`); the id is a per-backend fact and lives in the model card.

The decisive finding is that **only OpenRouter serves models this registry already
tracks**. Groq, Together, Fireworks, and DeepInfra are open-weight inference hosts:
adopting any of them would mean first adding Llama/Qwen/DeepSeek/Kimi cards — new
models whose weights we don't track, which this mission puts explicitly out of
scope. Their actual differentiator (custom silicon and serving speed on open
weights) is a genuinely interesting future comparison, but it is a *different*
question: it belongs to a mission that first decides to track open-weight models,
where the backend and the model would be introduced together.

## Decision

Support **OpenRouter** as the only aggregator gateway backend. Defer Groq,
Together, Fireworks, and DeepInfra.

- OpenRouter is reached through the same base-URL variant of the OpenAI adapter as
  xAI and Perplexity (`vendors/llm/openrouter.ts`, no new dependency), key-gated on
  `OPENROUTER_API_KEY` through the generalized credential contract.
- Its cards pin **explicit** OpenRouter ids (`anthropic/claude-opus-4.8`), never
  the `~vendor/model-latest` routing aliases: a benchmark subject must be a fixed
  model, and an alias that silently re-points would break the historical series.
- Effort is declared `n/a` for the first OpenRouter cards. OpenRouter maps a
  reasoning knob per underlying model, and sending an effort a model does not
  honor is a hard 400 (a failed run, not a finding). Widening the effort ladder is
  a follow-up once a real run confirms the mapping per model.

## Consequences

- The comparison can answer "does routing Claude Opus 4.8 through OpenRouter cost
  latency or throughput versus first-party?" — with price held constant, the
  measurement isolates the gateway.
- Revisiting Groq/Together/Fireworks/DeepInfra requires a prior decision to track
  open-weight models; this ADR should be superseded, not amended, at that point.
- The survey is a point-in-time reading: these gateways' catalogues move quickly,
  and OpenRouter could serve an open-weight model we later track (or drop one we
  do). Re-run the `/models` check before relying on this table.
