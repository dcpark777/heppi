.PHONY: dev build install help run stop

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

dev: ## Start development server (Vite)
	@echo "🔧 Starting development server..."
	npm run dev

run: dev ## Alias for dev - start development server

stop: ## Stop development server (use Ctrl+C in the terminal running 'make dev')
	@echo "ℹ️  The dev server runs in the foreground."
	@echo "   To stop it, press Ctrl+C in the terminal where it's running."
	@echo "   Or close that terminal window."

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
