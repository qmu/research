---
source_artifact: image-generation-comparison.real.data.json
source_commit: 2601137
insights_model: claude-sonnet-5
generated_at: 2026-07-18T15:12:03.969Z
trials: 1
provenance: llm-insights
---
Grok Imagine is the standout result in this artifact: it recorded perfect prompt adherence (mean 1.0 across 11 adherence checks) and perfect text-render accuracy (mean 1.0 across 2 text prompts), while running at a mean generation latency of roughly 5.3 seconds and a per-image cost of $0.02 — the cheapest of the models tested. GPT Image 1.5 also rendered text perfectly (mean 1.0 across its 2 text prompts) and posted strong adherence (mean 0.95 across 11 checks), but it took substantially longer per image (mean latency ~18.1 seconds, more than 3x Grok's) and cost more ($0.034/image). The two adherence misses for GPT Image 1.5 were partial-credit failures (0.75 each) on the infographic and meeting-document prompts — one missed an exact bar-count constraint, the other missed a "dense small text" constraint — suggesting document/infographic layouts are where it's more likely to drop a sub-requirement, whereas Grok satisfied every constraint on those same prompts in this run.

The clearest trade-off visible here is speed-and-cost versus none of the traditional accuracy penalty: Grok's latency and price advantages did not come with any observed adherence or text-rendering cost in this single-trial sample. That said, GPT Image 1.5's higher latency correlates with request complexity in the call log — its slowest generations (25.7s, 28.1s, 31.2s) were the slide, character, and document prompts, which suggests OpenAI's pipeline may spend more compute on layout-heavy composites, though the artifact doesn't isolate cause from correlation.

Gemini 2.5 Flash Image is not usable for this comparison: its run is marked "error" (image generation returned no image), with all stats at n=0. This should be read as a failed measurement, not a zero or floor score, and the model should be treated as unevaluated here rather than as a poor performer.

Two limits should temper any strong conclusions: every figure is a single-trial measurement (trials=1), so there is no repeated-sampling variance to distinguish a fluke run from a stable capability, and the underlying per-call stdDev values (e.g., GPT Image 1.5's latency stdDev of ~6,170ms against a mean of ~18,085ms) show meaningful spread even within that one run's 13 prompts. Judgments were produced by a single LLM judge (claude-sonnet-5) rather than human raters, and pricing reflects listed per-image rates at the stated size tiers, not volume or negotiated pricing. Given only one trial per model, this artifact is best read as a directional signal — Grok Imagine favorable on speed, cost, and adherence in this run — rather than a statistically robust ranking.
