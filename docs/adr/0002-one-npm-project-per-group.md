# 0002 — One npm project per group, topics as subfolders

## Context

Research divides into two groups: technical (`packages/tech/`) and industry
(`packages/industry/`). Each group accumulates many research topics over time
(LLM benchmarks, architecture studies, market surveys). Topics could each be a
separate npm project, or each group could be one project holding topics as
subfolders.

## Decision

Each group is a single npm project. A research topic is a subfolder under that
project's `src/` (for example `src/llm-benchmark/`), not a new package.

## Alternatives considered

- **One npm project per topic** (`packages/tech/<topic>/`): maximum isolation per
  research, but proliferates `package.json` and lockfiles as topics grow, raising
  maintenance cost across many manifests.

## Consequences

- Far fewer manifests to maintain; topics within a group share the toolchain.
- The layered `src/` convention (`domain/` per topic, shared `entrypoints/` and
  `vendors/`) keeps topics separable inside one project.
- Reproducibility is per group: a reader clones, installs the group's project,
  and runs a topic's entrypoint. Each result page documents its exact commands.
