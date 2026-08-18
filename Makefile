# Canonical task runner for the research monorepo.
# CI invokes these same targets, so what runs in CI runs locally.

PACKAGES := packages/tech packages/industry

# Overridable so `scripts/check-make-gate.sh` can point the per-package and docs
# steps at a scratch fixture and assert the recipes' RAW exit codes without
# running the repository's real suites. Nothing else should override these.
DOCS_DIR := docs

# Run one npm script across every package, report EVERY package that failed, and
# return non-zero if any did.
#
# The status is accumulated EXPLICITLY, and that is the whole point. This used to
# be a bare `@for p in $(PACKAGES); do (cd $$p && npm test); done`, which make
# runs as ONE recipe line and therefore evaluates as ONE exit status: the shell's.
# A POSIX `for` loop's status is its LAST iteration's, so every earlier package's
# failure was silently discarded. Because `packages/tech` — essentially all of
# this repo's code — is listed FIRST, it sat permanently in the masked position:
# `make test` returned 0 on a tree that failed its own tests, and CI invokes these
# same targets. `main` was genuinely red at 0b09ddc while CI reported green.
#
# Accumulating (rather than `set -e` fail-fast) is deliberate: for test/lint a
# single run should name every broken package, not just the first. Do NOT
# reintroduce a bare loop, and do NOT "fix" this by reordering PACKAGES — that
# hides the bug behind luck and re-exposes whichever package is added next.
#
# $(1) = human label for the step, $(2) = the command to run inside each package.
define for_each_package
@rc=0; failed=""; \
for p in $(PACKAGES); do \
	echo "==> $(1) $$p"; \
	if (cd $$p && $(2)); then :; else rc=1; failed="$$failed $$p"; fi; \
done; \
if [ "$$rc" -ne 0 ]; then echo "make: $(1) FAILED in:$$failed" >&2; fi; \
exit $$rc
endef

.PHONY: help install install-docs build test lint format docs a11y deploy-docs drift gate ledger publish-guard publish

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-13s %s\n", $$1, $$2}'

install: ## Install dependencies in every package and the docs site
	$(call for_each_package,install,npm install)
	@$(MAKE) --no-print-directory install-docs

# Split out so the deploy job can install what `deploy-docs` actually needs
# without pulling in the research packages' SDKs, which no part of the site
# build touches.
install-docs: ## Install only the docs site's dependencies
	@echo "==> install docs"; (cd $(DOCS_DIR) && npm install)

build: ## Type-check and build every package and the docs site
	$(call for_each_package,build,npm run build)
	@echo "==> build docs"; (cd $(DOCS_DIR) && npm run build)

test: ## Type-check and run unit tests in every package
	$(call for_each_package,test,npm test)

lint: ## Lint and format-check every package
	$(call for_each_package,lint,npm run lint)

format: ## Apply formatting across every package
	$(call for_each_package,format,npm run format)

docs: ## Run the local research preview site (VitePress)
	@cd $(DOCS_DIR) && npm run dev

a11y: ## Check the built preview site against WCAG 2.2 AA (needs `make build`)
	@cd $(DOCS_DIR) && npm run a11y

# The whole deploy path lives here rather than in workflow YAML ("one runner"):
# CI's deploy job runs exactly this target, so the same command releases the
# staging site from a developer's machine.
#
# Credentials are checked BEFORE the build so a missing secret fails in the
# first second with a name, instead of building for a minute and then letting
# wrangler try to open an interactive browser login (which in a runner exits
# with an error nobody can read). Never add `|| true` here — see the 0b09ddc
# masking incident recorded in CLAUDE.md.
deploy-docs: ## Build the preview site and deploy it to the Cloudflare Worker
	@missing=""; \
	[ -n "$$CLOUDFLARE_API_TOKEN" ] || missing="$$missing CLOUDFLARE_API_TOKEN"; \
	[ -n "$$CLOUDFLARE_ACCOUNT_ID" ] || missing="$$missing CLOUDFLARE_ACCOUNT_ID"; \
	if [ -n "$$missing" ]; then \
		echo "make: deploy-docs needs these unset variables:$$missing" >&2; \
		echo "make: supply them from repository secrets (see CLAUDE.md, Deploy)." >&2; \
		exit 1; \
	fi
	@echo "==> build docs"; (cd $(DOCS_DIR) && npm run build)
	@echo "==> deploy docs"; (cd $(DOCS_DIR) && npm run deploy)

drift: ## Regenerate every keyless fixture and fail on drift from committed artifacts
	@bash scripts/check-fixture-drift.sh

gate: ## Prove the per-package targets report failures instead of masking them
	@bash scripts/check-make-gate.sh

ledger: ## Check the .workaholic/ ledger indexes against their directories
	@sh scripts/check-workaholic-indexes.sh

publish-guard: ## Prove the exporter cannot silently overwrite downstream prose
	@bash scripts/check-publish-guard.sh

publish: ## Copy finished research Markdown to the corporate site
	@bash scripts/publish-research.sh --all
