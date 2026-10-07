.DEFAULT_GOAL := help

COMPOSE := docker compose

.PHONY: help setup install up down restart build logs ps backend-logs frontend-logs clean fclean dev-backend dev-frontend

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"; printf "DocuMind commands:\n"} /^[a-zA-Z_-]+:.*##/ {printf "  make %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Create .env from the example if it does not exist
	@test -f .env || cp .env.example .env
	@echo "Environment file ready. Set GROQ_API_KEY in .env before chatting."

install: ## Install backend and frontend dependencies inside Docker images
	$(COMPOSE) build

up: setup ## Build and start the frontend and backend
	$(COMPOSE) up --build -d
	@echo "DocuMind is running at http://localhost:3000"

down: ## Stop the application
	$(COMPOSE) down

restart: ## Restart the application containers
	$(COMPOSE) restart

build: ## Build application images
	$(COMPOSE) build

logs: ## Follow logs from all services
	$(COMPOSE) logs -f

backend-logs: ## Follow backend logs
	$(COMPOSE) logs -f backend

frontend-logs: ## Follow frontend logs
	$(COMPOSE) logs -f frontend

ps: ## Show service status
	$(COMPOSE) ps

clean: ## Stop services and remove containers (keeps indexed documents)
	$(COMPOSE) down --remove-orphans

fclean: ## Full reset: remove containers, local images, uploads, and ChromaDB data
	$(COMPOSE) down --remove-orphans --rmi local --volumes
	sudo rm -rf ./data ./chroma_data

dev-backend: ## Run FastAPI locally with reload
	cd backend && uvicorn app.main:app --reload

dev-frontend: ## Run Vite locally
	cd frontend && npm run dev
