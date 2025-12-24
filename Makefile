.PHONY: dev build install help

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start development server (Vite)
	@echo "🔧 Starting development server..."
	npm run dev

build: ## Build for production
	@echo "🔨 Building for production..."
	npm run build
	@echo "✅ Build complete! Output in dist/"

install: ## Install npm dependencies
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed!"

preview: build ## Preview production build locally
	@echo "👀 Previewing production build..."
	npm run preview
