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
	terraform apply -auto-approve
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

ecr-login: ## Login to AWS ECR
	@echo "🔐 Logging into ECR..."
	@eval $$(cd terraform && terraform output -raw ecr_login_command)

ecr-push: build ecr-login ## Build and push image to ECR
	@echo "📤 Pushing to ECR..."
	@ECR_URL=$$(cd terraform && terraform output -raw ecr_repository_url); \
	podman tag heppi:latest $$ECR_URL:latest && \
	podman push $$ECR_URL:latest
	@echo "✅ Image pushed to ECR!"

ecr-deploy: ecr-push ## Build, push to ECR, and trigger deployment
	@echo "🚀 Deployment triggered!"
	@echo "The EC2 instance will automatically pull and restart the container."
	@echo "Note: You may need to SSH in and run: podman pull <ecr-url> && podman restart heppi-app"

deploy-app: ## Deploy application from Git to EC2 instance
	@echo "🚀 Deploying application to EC2..."
	@INSTANCE_IP=$$(cd terraform && terraform output -raw instance_public_ip); \
	SSH_KEY=$$(cd terraform && terraform output -raw ssh_command | awk '{print $$3}'); \
	echo "Copying deployment script to instance..."; \
	scp -i $$SSH_KEY terraform/deploy-app.sh ec2-user@$$INSTANCE_IP:/tmp/ && \
	ssh -i $$SSH_KEY ec2-user@$$INSTANCE_IP "chmod +x /tmp/deploy-app.sh && /tmp/deploy-app.sh"
	@echo "✅ Deployment complete!"

