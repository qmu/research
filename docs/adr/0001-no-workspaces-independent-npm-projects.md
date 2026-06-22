# 0001 — Independent npm projects, no workspaces

## Context

The repository hosts multiple research packages. A monorepo can either use a
workspace tool (npm/pnpm/yarn workspaces with a root manifest) or keep each
package as an independent npm project. Every sibling repository at qmu
(`data-platform`, `plgg`, `coop-csnet`, `qmu-co-jp`) uses independent packages:
no root `package.json`, each package with its own `package-lock.json` and
`tsconfig.json`, CI workflows path-filtered per package.

## Decision

No root `package.json` and no workspaces. Each package under `packages/` is an
independent npm project with its own lockfile and `tsconfig.json`. The repository
is tied together by a `Makefile` that fans out to each package, not by a
workspace graph.

## Alternatives considered

- **npm workspaces**: a shared install and hoisted `node_modules`. Rejected to
  match house convention and to avoid editing many manifests for a shared root;
  it also couples package dependency resolution.

## Consequences

- Each package installs and builds in isolation; a reader can clone and run one
  package without the others.
- Common operations are consolidated in the `Makefile` so the lack of a workspace
  runner does not cost ergonomics.
- CI sets up per-package, path-filtered workflows as packages grow.
