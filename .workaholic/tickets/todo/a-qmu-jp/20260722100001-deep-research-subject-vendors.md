---
title: "All five deep-research subjects reachable behind vendors/"
created_at: 2026-07-22T10:00:01+09:00
author: a@qmu.jp
status: todo
type: enhancement
layer: [Infrastructure]
effort: 4h
commit_hash:
category: Added
mission: periodic-research-target-compare-deep-research-alike-apis
depends_on: [20260714013000-scaffold-deep-research-instrument.md]
---

# All five deep-research subjects reachable behind vendors/

## Overview

The keyless `deep-research` skeleton (5-subject registry, rubric manifest, pure
scorers, fixture path, `--estimate` ≈ $32) landed with the scaffold drive. This
ticket implements the **real** subject adapters: one client per subject behind the
`vendors/` anti-corruption layer that issues a deep-research query and returns the
report + citations + billed usage in the shared port shape. The five subjects are
those enumerated in the approved proposal:

1. **OpenAI** `o3-deep-research` — Responses API, web search always-on.
2. **Perplexity** `sonar-deep-research` — OpenAI-compatible chat endpoint.
3. **Google Gemini Deep Research** — `deep-research-preview-04-2026`, Interactions
   API, `background=True`.
4. **xAI Grok DeepSearch** — Grok 4.x + Agent Tools (Web/X Search).
5. **Anthropic build-your-own baseline** — Claude (current catalog model) +
   `web_search` tool + extended thinking, a self-orchestrated agentic loop; the
   reproducible in-house reference, not a single vendor endpoint.

Flip each subject's reachability flag as its adapter lands; a subject whose key is
absent stays honestly unreachable. One tier per subject for the first trial
(record the tier in the artifact); a second tier is a later scope change.

**Gated:** introduces provider SDK dependencies — record each in
`docs/dependency-decisions.md`. No `--real` spend under this ticket; that is the
first-validation-trial ticket, after the proposal-approved `--estimate` is
confirmed within the Floor ceiling.

## Key Files

- `packages/tech/src/deep-research/vendors/` — the port + fixture to implement
  against (reuse the `CompletionClient`-style port pattern).
- `packages/tech/src/deep-research/models.ts` — subject registry + reachability
  flags + `FIXTURE_*` reference values.
- `packages/tech/src/deep-research/entrypoints/` — the real factory wiring for
  `--real`, mirroring the fixture factory.
- `docs/dependency-decisions.md` — one entry per new provider dependency.

## Policies

- **proposal-first ゲートは充足済み** — 2026-07-22 に Floor tier で承認済み。本
  チケットは有償実行を含まない（アダプター実装 + fixture 経路のみ）。有償試行は
  first-validation-trial チケットで、`--estimate` が ≈$32 の Floor 天井内である
  ことを確認してから行う。
- **keyless fixture 不可侵** — CI が依存する fixture 経路はバイト安定・キーレスの
  まま保つ。キーが無い subject は正直に unreachable とし、数値を捏造しない。
- **workaholic:implementation** — ベンダー型は `vendors/` の anti-corruption 境界
  に留め、`domain/` に漏らさない。新規依存は `docs/dependency-decisions.md` に記録。
- **one tier per subject** — 各 subject は 1 tier に固定し、tier を artifact に
  記録する。第 2 tier は将来のスコープ変更（無言の分散にしない）。

## Implementation Steps

1. Define/confirm the `vendors/` deep-research port (query in → report, citations,
   billed usage out) and keep the keyless fixture implementing it byte-stable.
2. Add one `vendors/<subject>.ts` adapter per subject against its documented entry
   point; keep provider SDK types out of `domain/`.
3. Wire the real factory in `entrypoints/` so `--real` selects an adapter per
   subject whose credentials are present, else records it unreachable.
4. Flip each subject's reachability flag as its adapter lands; record the fixed
   tier per subject in the artifact.
5. Record every new provider dependency in `docs/dependency-decisions.md`.

## Quality Gate

- `cd packages/tech && npm test` の bare exit code が 0（`make` を経由しない、
  マスクしない）。lint も緑。
- 5 subject すべてに `vendors/` アダプターが存在し、reachability フラグが実態と
  一致する。キー不在の subject は unreachable として現れる（捏造ゼロ）。
- keyless fixture 経路がバイト安定で、キーレスのまま CI が緑。
- 新規依存が `docs/dependency-decisions.md` に記録されている。
- ベンダー型が `domain/` に漏れていない（anti-corruption 境界を保持）。

## Considerations

Provider SDK types stay behind `vendors/`. A subject with no key is an honest
`unreachable`, never a fabricated row. Fix one tier per subject and record it.
