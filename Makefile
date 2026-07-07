# fujipp-personal-platform — local dev runner
# Run one layer per terminal, or use `make dev` / `make dev-full` to run several at once.
# See docs/operations/secrets-inventory.md for the env each service needs.

SHELL := /bin/bash

# Ports: frontend 5173 · backend 8080 · billing 8081 · voucher 8082 · runtime 8090

.DEFAULT_GOAL := help

.PHONY: help dev dev-full frontend backend billing voucher runtime \
        db-start db-stop check-secrets

help: ## Show this help
	@echo "fujipp local dev — common targets:"
	@echo ""
	@echo "  make dev          frontend + backend (the 90% case)"
	@echo "  make dev-full     backend + billing + voucher + runtime + frontend"
	@echo ""
	@echo "  make frontend     frontend only          (:5173)"
	@echo "  make backend      backend only           (:8080)"
	@echo "  make billing      billing-service only   (:8081)"
	@echo "  make voucher      voucher-service only   (:8082)"
	@echo "  make runtime      orchestrator only      (:8090, spawns central-bot)"
	@echo ""
	@echo "  make db-start     start local Supabase    make db-stop  stop it"
	@echo "  make check-secrets  verify shared secrets match across .env files"
	@echo ""
	@echo "Tip: 'make dev*' interleaves logs in one terminal (Ctrl+C stops all)."
	@echo "     For clean separate logs, run each target in its own terminal."

# ── Individual layers (one per terminal) ─────────────────────────────────────

frontend: ## Run the frontend (Vite, :5173)
	cd frontend && bun run dev

backend: ## Run the backend (Spring Boot, :8080)
	cd backend && ./mvnw spring-boot:run

billing: ## Run billing-service (Spring Boot, :8081 — needs system maven)
	cd services/billing-service && mvn spring-boot:run

voucher: ## Run voucher-service (Spring Boot, :8082 — needs system maven + .env)
	cd services/voucher-service && mvn spring-boot:run

runtime: ## Run the orchestrator (Node, :8090 — spawns central-bot per bot)
	cd services/bot-runtime-service && npm run dev

# ── Combined (background + kill the whole group on Ctrl+C) ────────────────────

dev: ## frontend + backend together
	@echo "→ backend (:8080) + frontend (:5173). Ctrl+C stops both."
	@trap 'kill 0' EXIT INT TERM; \
	( cd backend && ./mvnw spring-boot:run ) & \
	( cd frontend && bun run dev ) & \
	wait

dev-full: ## backend + billing + voucher + runtime + frontend together
	@echo "→ full stack. Each service needs its own .env (see docs/operations/secrets-inventory.md). Ctrl+C stops all."
	@trap 'kill 0' EXIT INT TERM; \
	( cd backend && ./mvnw spring-boot:run ) & \
	( cd services/billing-service && mvn spring-boot:run ) & \
	( cd services/voucher-service && mvn spring-boot:run ) & \
	( cd services/bot-runtime-service && npm run dev ) & \
	( cd frontend && bun run dev ) & \
	wait

# ── Local Supabase ────────────────────────────────────────────────────────────

db-start: ## Start local Supabase (Postgres :54322, API :54321)
	supabase start

db-stop: ## Stop local Supabase
	supabase stop

# ── Checks ──────────────────────────────────────────────────────────────────

check-secrets: ## Verify shared secrets match across .env files (no values printed)
	@bash scripts/check-secrets.sh
