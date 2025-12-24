#!/bin/bash
# Don't use set -e as it can cause premature exit during initialization
# Instead, check return codes explicitly where needed

# Variables from Terraform
SUBDOMAIN="${subdomain}"
DOMAIN_NAME="${domain_name}"
FULL_DOMAIN="${full_domain}"
GIT_REPO_URL="${git_repo_url}"

# Update system
echo "Updating system packages..."
dnf update -y || { echo "WARNING: dnf update had issues, continuing..."; }

# Install Docker (more reliable on AWS than Podman)
echo "Installing Docker..."
dnf install -y docker || { echo "ERROR: Failed to install docker"; exit 1; }
systemctl enable docker || { echo "ERROR: Failed to enable docker"; exit 1; }
systemctl start docker || { echo "ERROR: Failed to start docker"; exit 1; }

# Install Nginx
echo "Installing Nginx..."
dnf install -y nginx || { echo "ERROR: Failed to install nginx"; exit 1; }

# Skip Certbot - not using SSL for now
# dnf install -y certbot python3-certbot-nginx || { echo "ERROR: Failed to install certbot"; exit 1; }

# Install Git
echo "Installing Git..."
dnf install -y git || { echo "ERROR: Failed to install git"; exit 1; }

# Configure Nginx as reverse proxy (HTTP only, no SSL)
cat > /etc/nginx/conf.d/heppi.conf <<NGINX_CONFIG
server {
    listen 80;
    server_name $FULL_DOMAIN _;
    
    # Proxy to application
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX_CONFIG

# Don't start Nginx yet - wait for container to be ready first
# We'll start it after the container is running

# Configure AWS CLI for ECR (if using ECR)
# Note: Instance role should have ECR permissions, or configure AWS credentials

# Auto-deploy application from ECR
ECR_REPO="${ecr_repository_url}"
AWS_REGION="${aws_region}"

# Wait for AWS CLI to be available and IAM role to be attached
# Also wait for instance metadata service
sleep 20
# Install AWS CLI if not present (should be on Amazon Linux 2023)
dnf install -y aws-cli || true

# Deploy from ECR (primary method)
if [ -n "$ECR_REPO" ] && command -v aws &> /dev/null; then
    echo "=========================================="
    echo "Deploying from ECR: $ECR_REPO"
    echo "=========================================="
    
    # Wait a bit more for IAM role to be fully attached
    sleep 10
    
    # Login to ECR using IAM role
    echo "Logging into ECR..."
    aws ecr get-login-password --region $AWS_REGION 2>&1 | docker login --username AWS --password-stdin $ECR_REPO 2>&1
    
    if [ $? -ne 0 ]; then
        echo "⚠️  ECR login failed, will try Git deployment"
    else
        # Pull the latest image
        echo "Pulling latest image from ECR..."
        docker pull $ECR_REPO:latest 2>&1
        
        if [ $? -eq 0 ]; then
            # Stop and remove existing container if running
            docker stop heppi-app 2>/dev/null || true
            docker rm heppi-app 2>/dev/null || true
            
            # Run the container
            echo "Starting application container..."
            docker run -d \
                --name heppi-app \
                -p 3000:3000 \
                --restart unless-stopped \
                $ECR_REPO:latest 2>&1
            
            if [ $? -eq 0 ]; then
                echo "✅ Application deployed from ECR!"
                sleep 5
                docker ps | grep heppi-app || echo "⚠️  Container may not be running"
                docker logs heppi-app 2>&1 | tail -20 || true
                
                # Test if container is responding
                sleep 5
                curl -f http://localhost:3000 > /dev/null 2>&1 && echo "✅ Container is responding on port 3000" || echo "⚠️  Container not responding yet"
                
                # Start Nginx now that container is running
                echo "Starting Nginx..."
                systemctl enable nginx || { echo "ERROR: Failed to enable nginx"; exit 1; }
                systemctl start nginx || { echo "ERROR: Failed to start nginx"; exit 1; }
                
                # Wait for DNS to propagate
                echo "Waiting for DNS to propagate..."
                sleep 30
                
                # Ensure Nginx is running and can proxy
                systemctl status nginx --no-pager | head -5 || systemctl restart nginx
                echo "✅ Setup complete!"
            else
                echo "ERROR: Failed to start container from ECR"
                exit 1
            fi
        else
            echo "⚠️  ECR pull failed, will try Git deployment"
        fi
    fi
fi

# Fallback: Deploy from Git (if ECR fails and GIT_REPO_URL is set)
if [ -n "$GIT_REPO_URL" ]; then
    echo "ECR deployment failed, falling back to Git..."
    echo "Cloning repository from $GIT_REPO_URL..."
    cd /home/ec2-user
    git clone $GIT_REPO_URL heppi-app || true
    cd heppi-app
    
    # Build and run with Docker
    echo "Building application..."
    docker build -t heppi:latest .
    
    # Stop existing container if running
    docker stop heppi-app 2>/dev/null || true
    docker rm heppi-app 2>/dev/null || true
    
    # Run the application
    echo "Starting application..."
    docker run -d \
        --name heppi-app \
        -p 3000:3000 \
        --restart unless-stopped \
        heppi:latest
    
    echo "Application deployed from Git and running!"
    
    # Start Nginx now that container is running
    echo "Starting Nginx..."
    systemctl enable nginx || { echo "ERROR: Failed to enable nginx"; exit 1; }
    systemctl start nginx || { echo "ERROR: Failed to start nginx"; exit 1; }
    
    # Wait for DNS to propagate
    echo "Waiting for DNS to propagate..."
    sleep 30
else
    echo "⚠️  No deployment method available."
    echo "Please push an image to ECR first: make ecr-push"
    # Start Nginx anyway so we can at least see if it's working
    systemctl enable nginx || true
    systemctl start nginx || true
fi

echo "Heppi instance is ready!"
echo "Domain: $FULL_DOMAIN"

