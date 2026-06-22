# Canonical task runner for the research monorepo.
# CI invokes these same targets, so what runs in CI runs locally.

PACKAGES := packages/tech packages/industry

.PHONY: help install build test lint format docs publish

help: ## List available commands
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  make %-10s %s\n", $$1, $$2}'

install: ## Install dependencies in every package
	@for p in $(PACKAGES); do echo "==> install $$p"; (cd $$p && npm install); done

build: ## Type-check and build every package
	@for p in $(PACKAGES); do echo "==> build $$p"; (cd $$p && npm run build); done

test: ## Type-check and run unit tests in every package
	@for p in $(PACKAGES); do echo "==> test $$p"; (cd $$p && npm test); done

lint: ## Lint and format-check every package
	@for p in $(PACKAGES); do echo "==> lint $$p"; (cd $$p && npm run lint); done

format: ## Apply formatting across every package
	@for p in $(PACKAGES); do echo "==> format $$p"; (cd $$p && npm run format); done

docs: ## Run the local research preview site (VitePress)
	@echo "Reserved. Implemented by ticket 20260622191215 (VitePress preview site)."

publish: ## Copy finished research Markdown to the corporate site
	@echo "Reserved. Implemented by ticket 20260622191216 (qmu-co-jp publish pipeline)."
