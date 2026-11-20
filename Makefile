# ==============================================================================
# URL to Hugo Markdown Post Generator - Makefile
# ==============================================================================

SHELL := /bin/bash
IMAGE_NAME ?= url-to-hugo-generator
IMAGE_TAG ?= latest
PORT ?= 3000

.PHONY: help install dev build test test-watch lint clean docker-build docker-run docker-stop compose-up compose-down compose-logs health-check

# Default target
help: ## Display available commands and documentation
	@echo "======================================================================"
	@echo "  URL to Hugo Generator - Available Make Targets                      "
	@echo "======================================================================"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ------------------------------------------------------------------------------
# Development & Quality Assurance
# ------------------------------------------------------------------------------
install: ## Install all Node.js dependencies
	npm install

dev: ## Start local development server (port 3000)
	npm run dev

build: ## Build production client SPA and bundled backend server (dist/server.cjs)
	npm run build

start: ## Start production server from dist/server.cjs
	npm run start

test: ## Run Vitest test suite once
	npm run test

test-watch: ## Run Vitest in interactive watch mode
	npm run test:watch

lint: ## Run TypeScript type-checker
	npm run lint

clean: ## Clean build artifacts and distribution directories
	npm run clean

# ------------------------------------------------------------------------------
# Docker Commands
# ------------------------------------------------------------------------------
docker-build: ## Build the multi-stage Docker container image
	docker build -t $(IMAGE_NAME):$(IMAGE_TAG) .

docker-run: ## Run Docker container locally with port 3000 binding and generated volume
	docker run --rm -d \
		--name $(IMAGE_NAME) \
		-p $(PORT):3000 \
		-v $$(pwd)/generated:/app/generated \
		--env-file .env \
		$(IMAGE_NAME):$(IMAGE_TAG)

docker-stop: ## Stop and remove running Docker container
	docker stop $(IMAGE_NAME) || true

# ------------------------------------------------------------------------------
# Docker Compose Commands
# ------------------------------------------------------------------------------
compose-up: ## Build and launch the container stack via Docker Compose
	docker compose up -d --build

compose-down: ## Stop and remove Docker Compose containers and networks
	docker compose down

compose-logs: ## Stream live logs from Docker Compose services
	docker compose logs -f

compose-restart: ## Restart Docker Compose services
	docker compose restart

# ------------------------------------------------------------------------------
# Diagnostics & Health Check
# ------------------------------------------------------------------------------
health-check: ## Test API health endpoint on local port 3000
	curl -s -f http://localhost:$(PORT)/api/health | grep "ok" && echo -e "\n\033[32m✔ Service is healthy!\033[0m" || echo -e "\n\033[31m✖ Service unreachable\033[0m"
