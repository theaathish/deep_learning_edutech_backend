#!/bin/bash

# Deployment script for EduTech to VM
# Run this on the VM to pull latest code and restart services

set -e

echo "🚀 Deploying EduTech to VM..."
echo ""

# Go to project directory
cd /opt/deep_learning_edutech

# Pull latest code
echo "📥 Pulling latest code from repository..."
git pull origin main

# Check if backend .env needs updating
if ! grep -q "^API_URL=" backend/.env; then
  echo "⚠️  Adding API_URL to backend/.env"
  cat >> backend/.env << 'EOF'

# API URL (for constructing media URLs in responses)
API_URL=https://api.deeplearningedutech.com
EOF
else
  echo "✓ API_URL already configured in backend/.env"
fi

# Rebuild backend
echo ""
echo "🔨 Building backend..."
cd backend
npm run build

# Ensure uploads directory exists
echo ""
echo "📁 Setting up uploads directory..."
bash scripts/setup-uploads.sh

# Restart PM2 process
echo ""
echo "🔄 Restarting backend service..."
npm run pm2:restart

# Wait for restart
sleep 3

# Check status
echo ""
echo "📊 Service status:"
npm run pm2:status

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Backend is running at: https://api.deeplearningedutech.com"
echo "Frontend is at: https://deep-learning-edutech.vercel.app"
echo ""
echo "Media files stored at: /opt/deep_learning_edutech/backend/uploads"
echo "Media served from: https://api.deeplearningedutech.com/uploads/"
