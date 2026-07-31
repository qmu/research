# Desk rules

Topic-desk conventions for self-orchestration in this repository. The
control-master session sits on the primary checkout (`~/projects/research`,
branch `main`); every write happens on a topic desk. See CLAUDE.md
"Orchestration (control-master operation)" for the session-level rules
(liveness, verification, PR gates).

## Topic desks

- A desk is a worktree of this repository itself at `.worktrees/<topic>/`
  (the path is gitignored). One desk per **continuing topic**, and one session
  per desk at a time.
- The topic set mirrors the active missions in `.workaholic/missions/active/`:

  | Desk | Mission |
  | --- | --- |
  | `.worktrees/pipeline/` | per-topic-research-pipeline-benchmark-llm-insights-jp-translation |
  | `.worktrees/iaas/` | support-iaas-hosted-models-vertex-ai-aws-bedrock |
  | `.worktrees/image-gen/` | image-generation-benchmark |
  | `.worktrees/agent-vm/` | periodic-research-target-compare-agent-vm-solutions-lambda-microvms-etc |
  | `.worktrees/trend/` | periodic-research-target-trend-catchable-ai-models-grok-perplexity |
  | `.worktrees/computer-use/` | periodic-research-target-computer-use-via-playwright |
  | `.worktrees/svg/` | periodic-research-target-svg-generation-and-animation |
  | `.worktrees/tts/` | periodic-research-target-text-to-speech-speech-to-text-speech-to-speech |
  | `.worktrees/deep-research/` | periodic-research-target-compare-deep-research-alike-apis |

  When a mission opens or closes, add or retire the matching desk.

## Cutting a desk branch

- At drive time, fetch first and cut fresh from the latest `origin/main`:

  ```
  git fetch origin
  git worktree add -b work-YYYYMMDD-HHMMSS .worktrees/<topic> origin/main
  ```

- Branch names are always the **literal** `work-YYYYMMDD-HHMMSS` — the guard
  rejects variable expansion.
- Always pass the start point as the unambiguous `origin/main`, never bare
  `main`: a filed workaholic bug shows `git worktree add` can silently discard
  `-b` and land on `main` when the start point is ambiguous. After adding,
  verify `git -C .worktrees/<topic> branch --show-current` equals the `-b`
  name.

## Stale local `main` on desks

The local `main` ref is only updated when the primary checkout pulls; desks go
structurally stale against it. Before /report and release-scan (which compare
against `main`), fast-forward local `main` (`git fetch origin main:main` from a
desk, when `main` is not checked out elsewhere) or base the comparison on
`origin/main`.

## Retiring a desk

When a topic closes (mission achieved/abandoned), remove the desk:

```
git worktree remove .worktrees/<topic>
```

Delete its merged `work-*` branches separately if needed. Do not leave retired
desks in place — a listed desk implies a continuable topic.
