#!/bin/bash
set -e

# Variables from Terraform
SUBDOMAIN="${subdomain}"
DOMAIN_NAME="${domain_name}"
FULL_DOMAIN="${full_domain}"
GIT_REPO_URL="${git_repo_url}"

# Update system
dnf update -y

# Install Podman
dnf install -y podman
systemctl enable podman.socket
systemctl start podman.socket

# Install Nginx
dnf install -y nginx

# Install Certbot for Let's Encrypt
dnf install -y certbot python3-certbot-nginx

# Install Git
dnf install -y git

# Configure Nginx as reverse proxy
cat > /etc/nginx/conf.d/heppi.conf <<NGINX_CONFIG
server {
    listen 80;
    server_name $FULL_DOMAIN;
    
    # Let's Encrypt validation
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    # Redirect HTTP to HTTPS (will be active after SSL setup)
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name $FULL_DOMAIN;
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/$FULL_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$FULL_DOMAIN/privkey.pem;
    
    # SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
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

# Create directory for Let's Encrypt validation
mkdir -p /var/www/certbot

# Start Nginx (will fail initially without SSL cert, that's ok)
systemctl enable nginx
systemctl start nginx || true

# Wait for instance to be fully ready and DNS to propagate
sleep 60

# Request SSL certificate from Let's Encrypt
certbot certonly --nginx \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN_NAME \
    -d $FULL_DOMAIN \
    --webroot \
    --webroot-path=/var/www/certbot || true

# Reload Nginx with SSL configuration
systemctl reload nginx || systemctl restart nginx

# Set up auto-renewal
systemctl enable certbot-renew.timer
systemctl start certbot-renew.timer

# Configure AWS CLI for ECR (if using ECR)
# Note: Instance role should have ECR permissions, or configure AWS credentials

# Auto-deploy application from ECR
ECR_REPO="${ecr_repository_url}"

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
    aws ecr get-login-password --region ${aws_region} 2>&1 | podman login --username AWS --password-stdin $ECR_REPO 2>&1
    
    if [ $? -ne 0 ]; then
        echo "⚠️  ECR login failed, will try Git deployment"
    else
        # Pull the latest image
        echo "Pulling latest image from ECR..."
        podman pull $ECR_REPO:latest 2>&1
        
        if [ $? -eq 0 ]; then
            # Stop and remove existing container if running
            podman stop heppi-app 2>/dev/null || true
            podman rm heppi-app 2>/dev/null || true
            
            # Run the container
            echo "Starting application container..."
            podman run -d \
                --name heppi-app \
                -p 3000:3000 \
                --restart unless-stopped \
                $ECR_REPO:latest 2>&1
            
            echo "✅ Application deployed from ECR!"
            podman ps | grep heppi-app || echo "⚠️  Container may not be running"
            sleep 2
            podman logs heppi-app 2>&1 | tail -20 || true
            exit 0
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
    
    # Build and run with Podman
    echo "Building application..."
    podman build -t heppi:latest .
    
    # Stop existing container if running
    podman stop heppi-app 2>/dev/null || true
    podman rm heppi-app 2>/dev/null || true
    
    # Run the application
    echo "Starting application..."
    podman run -d \
        --name heppi-app \
        -p 3000:3000 \
        --restart unless-stopped \
        heppi:latest
    
    echo "Application deployed from Git and running!"
else
    echo "⚠️  No deployment method available."
    echo "Please push an image to ECR first: make ecr-push"
fi

echo "Heppi instance is ready!"
echo "Domain: $FULL_DOMAIN"

