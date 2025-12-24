#!/bin/bash
# Script to manually trigger application deployment on EC2 instance

set -e

GIT_REPO_URL="https://github.com/dcpark777/heppi.git"

echo "🚀 Deploying application from Git..."
echo "Repository: $GIT_REPO_URL"

# Clone or update repository
cd /home/ec2-user
if [ -d "heppi-app" ]; then
    echo "📦 Updating existing repository..."
    cd heppi-app
    git pull || git fetch && git reset --hard origin/main
else
    echo "📦 Cloning repository..."
    git clone $GIT_REPO_URL heppi-app
    cd heppi-app
fi

# Build the application
echo "🔨 Building application..."
podman build -t heppi:latest .

# Stop and remove existing container
echo "🛑 Stopping existing container..."
podman stop heppi-app 2>/dev/null || true
podman rm heppi-app 2>/dev/null || true

# Run the new container
echo "🚀 Starting application..."
podman run -d \
    --name heppi-app \
    -p 3000:3000 \
    --restart unless-stopped \
    heppi:latest

echo "✅ Application deployed successfully!"
echo "📋 Container status:"
podman ps | grep heppi-app || echo "Container not running - check logs with: podman logs heppi-app"

