# Canonical task runner for the research monorepo.
# CI invokes these same targets, so what runs in CI runs locally.

PACKAGES := packages/tech packages/industry

.PHONY: help install build test lint format docs a11y publish

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install dependencies in every package and the docs site
	@for p in $(PACKAGES); do echo "==> install $$p"; (cd $$p && npm install); done
	@echo "==> install docs"; (cd docs && npm install)

build: ## Type-check and build every package and the docs site
	@for p in $(PACKAGES); do echo "==> build $$p"; (cd $$p && npm run build); done
	@echo "==> build docs"; (cd docs && npm run build)

test: ## Type-check and run unit tests in every package
	@for p in $(PACKAGES); do echo "==> test $$p"; (cd $$p && npm test); done

lint: ## Lint and format-check every package
	@for p in $(PACKAGES); do echo "==> lint $$p"; (cd $$p && npm run lint); done

format: ## Apply formatting across every package
	@for p in $(PACKAGES); do echo "==> format $$p"; (cd $$p && npm run format); done

docs: ## Run the local research preview site (VitePress)
	@cd docs && npm run dev

a11y: ## Check the built preview site against WCAG 2.2 AA (needs `make build`)
	@cd docs && npm run a11y

publish: ## Copy finished research Markdown to the corporate site
	@bash scripts/publish-research.sh --all
