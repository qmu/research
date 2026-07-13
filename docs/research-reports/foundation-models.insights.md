---
source_artifact: foundation-models.data.json
source_commit: 585e9a4
insights_model: claude-sonnet-5
generated_at: 2026-07-08T19:20:19.642Z
trials: 0
provenance: llm-insights
---
This catalog is a reference listing of publicly documented model specifications — provider, tier, list price, effort-level options, and API surface — not a benchmarked performance comparison. No latency, throughput, or accuracy figures are present, and the artifact explicitly carries "catalog" provenance with an unspecified trial count, so the only defensible use of this data is to compare *what providers offer and charge*, not *how well models perform*.

The most decision-relevant pattern is price dispersion within tiers rather than across them. At the "flagship" tier alone, output pricing spans from $2.50/MTok (Grok 4.20 Reasoning) to $30/MTok (GPT-5.5) — a 12x difference for models nominally competing in the same class. Input pricing shows a similar spread ($1.25 to $6 across flagship-and-above tiers). This suggests tier labels are self-reported marketing categories, not a normalized capability axis; a cost-sensitive selection should compare specific model IDs and their documented effort levels, not tier names alone.

Effort-level granularity is a second axis worth separating from price. Anthropic's frontier/flagship/mid models (Claude Fable 5, Opus 4.8, Sonnet 5) all expose five effort levels (low through max), while several xAI models (Grok 4.20 Reasoning/Non-Reasoning, Grok Build 0.1) expose only "n/a" — i.e., no tunable reasoning-effort knob is documented for those API surfaces. OpenAI's GPT-5.x family sits in between, offering a "none/low/medium/high" scale. This is a configurability trade-off: models with more effort levels give callers finer control over the cost/quality/latency curve per-request, but that flexibility isn't captured in the flat per-token price — a "cheap" model with no effort control may still be more expensive in aggregate if it can't be dialed down for simple tasks.

API surface is a categorical differentiator that price alone doesn't reveal: most entries use "chat," but OpenAI also lists "realtime" (GPT Realtime) and "responses" (GPT-5.3 Codex, GPT-5.1 Codex mini) surfaces, which imply different integration paths (streaming/voice vs. agentic tool-calling) rather than a strict quality tier. Choosing based on surface compatibility with existing infrastructure may matter more than the per-token price gap between, say, GPT-5.3 Codex ($1.75/$14) and a chat-surface competitor at similar output cost.

Finally, note what this artifact cannot support: it has no latency, error-rate, or task-accuracy measurements, so it cannot answer "which model is best," only "which model is cheapest or most configurable for a given provider/tier/surface combination." Prices are list rates from provider documentation (with source URLs) at time of catalog generation and are subject to change; treat them as a snapshot for relative comparison, not a guarantee of current billing. Any selection decision should pair this catalog with independent, measured benchmarks for the specific workload before committing.
