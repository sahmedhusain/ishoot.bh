# Backend developer tasks. Run `make help`. Tool versions are pinned here and run with `go run`, so nothing has to be
# installed besides Go and Docker.
GOLANGCI_LINT ?= github.com/golangci/golangci-lint/v2/cmd/golangci-lint@v2.15.0
GOVULNCHECK   ?= golang.org/x/vuln/cmd/govulncheck@v1.9.0
GOSEC         ?= github.com/securego/gosec/v2/cmd/gosec@v2.30.0
SERVICES      ?= $(patsubst services/%/cmd/api/main.go,%,$(wildcard services/*/cmd/api/main.go))
VERSION       ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
IMAGE_PREFIX  ?= platform

.PHONY: help gen gen-check fmt lint vuln sec test test-short cover build docker check

help: ## List the tasks
	@grep -hE '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

gen: ## Regenerate code and docs from contracts and config structs
	go generate ./...
	go run ./tools/config-doc ../docs/backend/CONFIG.md

gen-check: gen ## Fail when generated code or docs are out of date
	git diff --exit-code -- pkg/catalog/data services/files/internal/postgres/sqlcdb services/identity/internal/postgres/sqlcdb ../docs/backend/CONFIG.md

fmt: ## Format the code
	gofmt -w .

lint: ## Static analysis (golangci-lint)
	go run $(GOLANGCI_LINT) run ./...

vuln: ## Known vulnerabilities in dependencies and the standard library
	go run $(GOVULNCHECK) ./...

sec: ## Security static analysis
	go run $(GOSEC) -quiet -exclude-dir=tools ./...

test: ## All tests, with the race detector and integration tests (needs Docker)
	go test -race -count=1 ./...

test-short: ## Unit tests only (no Docker)
	go test -race -short ./...

cover: ## Tests with a coverage report in coverage.html
	go test -race -coverprofile=coverage.out ./... && go tool cover -html=coverage.out -o coverage.html

build: ## Build every service binary into bin/
	@for s in $(SERVICES); do CGO_ENABLED=0 go build -trimpath -o bin/$$s ./services/$$s/cmd/api || exit 1; done

docker: ## Build an image per service
	@for s in $(SERVICES); do docker build --build-arg SERVICE=$$s --build-arg VERSION=$(VERSION) -t $(IMAGE_PREFIX)/$$s:$(VERSION) . || exit 1; done

check: gen-check lint vuln test ## Everything CI runs
