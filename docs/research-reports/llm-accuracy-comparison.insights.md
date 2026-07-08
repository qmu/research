---
source_artifact: llm-accuracy-comparison.real.data.json
source_commit: 585e9a4
insights_model: claude-sonnet-5
generated_at: 2026-07-08T19:18:55.172Z
trials: 1
provenance: llm-insights
---
## LLM Output Accuracy: JSON-Schema Limits, Length Instructions, and Information Accuracy

The single most decision-relevant finding in this sweep is that **length-instruction following is wildly inconsistent within the same model family and does not track with effort level or price**. On the simple task of writing exactly a 100-word paragraph, several frontier and flagship configurations collapsed to near-total failure — Claude Sonnet 5 measured 0% length accuracy at both xhigh and max effort, and Gemini 3.5 Flash measured 27% at medium effort and 15% at high effort — while cheap, small models were near-perfect (GPT-5.4-nano scored 0.91–1.0 across all effort levels; GPT-5.4-mini and o4-mini also hit 1.0 in most configurations). This suggests that higher "effort" or reasoning budget is not a reliable proxy for instruction-following fidelity, and that teams optimizing for precise output-length control should benchmark the specific effort tier they intend to ship, not assume monotonic improvement with spend. Note this is drawn from a single trial per configuration, so a given 0% or 100% score could reflect a one-off failure rather than a stable rate — the volatility itself, however, is the signal worth acting on.

Second, **JSON-schema structural ceilings are architectural, not effort-tunable, and differ sharply by provider**. OpenAI's GPT-5.x and o4 family hit a hard API-enforced wall at 10 levels of nesting (schemas beyond that return a 400 "exceeds limit of 10" error, not a soft degradation) and reach a breadth ceiling of 192 fields (the highest tested value) without incident. Anthropic's Claude models (Fable 5, Opus 4.8, Sonnet 5, Haiku 4.5) tolerate deeper nesting — reliably to ~20–21 levels — but fail intermittently above that with 503 upstream errors or 180-second timeouts, and their breadth ceiling is markedly lower: requests above 73–76 fields trigger "compiled grammar is too large" errors, capping practical breadth around 72–73 fields versus OpenAI's 192. Google's Gemini models and xAI's Grok models tested deepest, with Grok models reaching 32–48 levels of nesting and Gemini reaching 15, both while sustaining the full 192-field breadth. For applications requiring wide flat objects (many sibling fields), OpenAI and Grok/Gemini are measured as substantially more permissive than Claude; for deeply recursive structures, Grok's tested ceiling (up to 48 levels) is the highest observed, though these deep-nesting calls sometimes required 30+ seconds to complete.

Third, there is a clear **latency vs.
