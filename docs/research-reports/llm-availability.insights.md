---
source_artifact: llm-availability.data.json
source_commit: 585e9a4
insights_model: claude-sonnet-5
generated_at: 2026-07-08T19:38:15.389Z
trials: 0
provenance: llm-insights
---
This dataset records four providers probed three times each, roughly one minute apart, over a single continuous window spanning approximately 134 seconds on 2026-07-08. It is a manual health-probe run, not a scheduled uptime monitor, and with only three samples per provider it cannot support claims about long-run availability or comparative reliability — the numbers below describe only what happened during this one short window.

The most notable observation is that xAI's Grok Build 0.1 recorded one timeout (responseTimeMs at the 10000ms cap, matching the configured timeout threshold) out of three samples, yielding a measured successRate of 0.667 for this window. The other three providers — Anthropic, Google, and OpenAI — each returned 3/3 successful responses in their windows, with successRate of 1. Per the artifact's downDefinition, a provider is only counted as "down" after two consecutive outage-eligible failures; xAI's single timeout did not meet that threshold, so downFrequency and downtimeDurationMs are recorded as 0 for all four providers, including xAI. This single timeout should be read as an isolated event within a tiny sample, not evidence of an outage or a pattern.

Response-time figures, where available, show a spread: Google's mean was fastest at 499ms, Anthropic next at roughly 782ms, then xAI at roughly 1660ms (excluding the timeout sample's effect is not separated out in the summary), and OpenAI slowest at roughly 1686ms mean. These are latency observations from three data points per provider and should not be treated as stable throughput benchmarks — they reflect one operator environment's network path and a single short session, not distributed or repeated testing.

The practical trade-off visible here is between response latency and the small-sample failure signal: OpenAI and xAI both show higher mean latencies than Google or Anthropic in this window, while xAI is also the only provider with a recorded non-success. None of this rises to a reliability ranking; with n=3 per provider and one uncontrolled, unrepeated window, a single timeout or a few hundred milliseconds of latency difference can easily reflect transient network conditions, provider-side jitter, or the specific request timing rather than any systematic property of the API.

Finally, the artifact explicitly censors gaps before the first sample, after the last sample, and between runs — no uptime or downtime is inferred outside the observed window. Trial count is otherwise unspecified beyond the three samples per provider shown, and the origin network/region for these probes was not concretely recorded in this run. Readers should treat this artifact as a snapshot suitable for illustrating the health-probe methodology, not as a basis for selecting a provider on availability grounds.
