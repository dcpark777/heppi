.PHONY: build run stop deploy help

# Variables
IMAGE_NAME := heppi
CONTAINER_NAME := heppi-app
PORT := 3000
TERRAFORM_DIR := terraform

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build the container image
	@echo "🐳 Building container image..."
	podman build -t $(IMAGE_NAME) .
	@echo "✅ Build complete!"

run: build ## Build the image and start local server
	@echo "🚀 Starting local server..."
	@if [ -n "$$(podman ps -q -f name=$(CONTAINER_NAME))" ]; then \
		echo "⚠️  Container already running. Stopping it first..."; \
		podman stop $(CONTAINER_NAME) || true; \
		podman rm $(CONTAINER_NAME) || true; \
	fi
	podman run -d \
		--name $(CONTAINER_NAME) \
		-p $(PORT):$(PORT) \
		$(IMAGE_NAME)
	@echo "✅ Server running at http://localhost:$(PORT)"
	@echo "📋 View logs: podman logs -f $(CONTAINER_NAME)"

stop: ## Stop local server and clean up
	@echo "🛑 Stopping server..."
	@if [ -n "$$(podman ps -q -f name=$(CONTAINER_NAME))" ]; then \
		podman stop $(CONTAINER_NAME); \
		echo "✅ Container stopped"; \
	else \
		echo "ℹ️  Container not running"; \
	fi
	@if [ -n "$$(podman ps -aq -f name=$(CONTAINER_NAME))" ]; then \
		podman rm $(CONTAINER_NAME); \
		echo "✅ Container removed"; \
	else \
		echo "ℹ️  Container not found"; \
	fi
	@echo "🧹 Cleanup complete!"

deploy: ## Deploy to AWS using Terraform
	@echo "☁️  Deploying to AWS..."
	@if [ ! -f "$(TERRAFORM_DIR)/terraform.tfvars" ]; then \
		echo "❌ Error: terraform.tfvars not found!"; \
		echo "   Please copy terraform.tfvars.example to terraform.tfvars and configure it."; \
		exit 1; \
	fi
	cd $(TERRAFORM_DIR) && \
	terraform init && \
	terraform plan && \
	terraform apply
	@echo "✅ Deployment complete!"
	@echo "📋 Check outputs above for instance details"

deploy-destroy: ## Destroy AWS infrastructure
	@echo "🗑️  Destroying AWS infrastructure..."
	cd $(TERRAFORM_DIR) && terraform destroy
	@echo "✅ Infrastructure destroyed!"

dev: ## Start development server (Vite)
	@echo "🔧 Starting development server..."
	npm run dev

install: ## Install npm dependencies
	@echo "📦 Installing dependencies..."
	npm install
	@echo "✅ Dependencies installed!"

