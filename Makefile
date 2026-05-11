.PHONY: help install install-hooks dev build test test-watch smoke lint fmt pages-preview clean pages-enable release

help:
	@echo "time-displaced-ears — make targets"
	@echo ""
	@awk -F':.*##' '/^[a-zA-Z_-]+:.*##/ {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## npm install dependencies
	npm install

install-hooks: ## wire .githooks via core.hooksPath
	git config core.hooksPath .githooks
	chmod +x .githooks/*
	@echo "git hooks installed (core.hooksPath = .githooks)"

dev: ## run vite dev server
	npm run dev

build: ## build into docs/ (Pages-ready)
	npm run build

test: ## run unit tests
	npm test

test-watch: ## run unit tests in watch mode
	npm run test:watch

smoke: ## build + Playwright happy-path
	npm run smoke

lint: ## eslint + tsc
	npm run lint

fmt: ## prettier write
	npm run fmt

pages-preview: build ## serve docs/ exactly as Pages would
	npm run pages-preview

pages-enable: ## one-time: enable GitHub Pages on this repo (main /docs)
	gh api -X POST /repos/baditaflorin/implemment-the-following-time-displaced-ears/pages \
		-f source[branch]=main -f source[path]=/docs || \
	gh api -X PUT /repos/baditaflorin/implemment-the-following-time-displaced-ears/pages \
		-f source[branch]=main -f source[path]=/docs

release: build ## tag a semver release (usage: make release VERSION=v0.2.0)
	@test -n "$(VERSION)" || (echo "usage: make release VERSION=vX.Y.Z" && exit 1)
	git tag -a $(VERSION) -m "Release $(VERSION)"
	git push origin $(VERSION)

clean: ## drop intermediate build artifacts (keeps docs/adr/)
	rm -rf dist .vite node_modules/.vite tmp
	@echo "kept: docs/ (publish root), node_modules/"
