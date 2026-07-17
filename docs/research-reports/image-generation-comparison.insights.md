---
source_artifact: image-generation-comparison.real.data.json
source_commit: 78a9397
insights_model: claude-sonnet-5
generated_at: 2026-07-17T00:53:39.901Z
trials: 1
provenance: llm-insights
---
All three measured models — GPT Image 1.5, Gemini 2.5 Flash Image, and Grok Imagine — achieved perfect scores on every prompt-adherence constraint (mean 1.0 across 6 prompts) and perfect text-rendering accuracy on both text tests (mean 1.0 across 2 prompts), with zero standard deviation. On this artifact's prompt set, accuracy is not a differentiator: all three correctly rendered "HELLO BENCHMARK" and "QMU RESEARCH 2026" verbatim and satisfied every compositional constraint (counts, colors, spatial relationships). This suggests that for the specific single-shot generation tasks tested here, model choice should be driven by latency and cost rather than quality concerns — though a saturated benchmark like this cannot distinguish adherence quality on harder or more ambiguous prompts.

Latency separates the three candidates sharply. Grok Imagine measured the fastest mean generation time (4976 ms, n=8, stdDev 535 ms), followed by Gemini 2.5 Flash Image (6526 ms, n=8, stdDev 1717 ms), with GPT Image 1.5 trailing at roughly double Grok's latency (11689 ms, n=8, stdDev 885 ms). Gemini's higher variance (stdDev of 1717 ms against a 6526 ms mean) indicates less predictable per-call timing than either Grok or GPT Image, which could matter for latency-sensitive pipelines even though its average is competitive.

Cost tracks a different ranking. Grok Imagine is the cheapest per image at $0.02, GPT Image 1.5 sits at $0.034, and Gemini 2.5 Flash Image is the most expensive at $0.039 (all at comparable ~1024x1024 tiers). Grok Imagine therefore wins on both latency and price in this artifact, making it the strongest default choice if these measurements generalize — it has no measured trade-off against the other two on the axes captured here. GPT Image 1.5's higher cost is not offset by any measured quality advantage, and its slower latency (roughly 2.3x Grok's) is a straightforward cost in throughput-sensitive use cases.

One incidental note: Gemini's output files are markedly larger (e.g., 907 KB–1.27 MB PNGs versus roughly 80–230 KB for GPT Image 1.5 and well under 130 KB for Grok's JPEGs), which is not scored here but may affect storage/bandwidth costs in a real deployment.

These results should be read with real caution: each figure comes from a single trial (trials=1) per prompt, so the reported means and standard deviations reflect one run's variability across 8 latency calls and 6–8 adherence/text calls per model, not repeated-trial statistics. The perfect adherence and text scores leave no headroom to detect quality differences that might emerge with harder prompts, adversarial inputs, or repeated sampling. Anthropic was excluded as a non-subject because it exposes no image-generation API. Given this, the artifact is best used to compare latency and cost characteristics under known-easy conditions rather than as a definitive ranking of generation quality.
