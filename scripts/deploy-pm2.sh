#!/bin/bash
# ==============================================
# EduTech Deployment Script (PM2)
# Run this to deploy updates
# ==============================================

set -e

APP_DIR="/opt/edutech-backend"
LOG_DIR="/var/log/edutech"

echo "=========================================="
echo "Deploying EduTech Backend"
echo "=========================================="

cd $APP_DIR

# Pull latest changes
echo "[1/6] Pulling latest code..."
git pull origin main

# Install dependencies
echo "[2/6] Installing dependencies..."
npm ci --production=false

# Generate Prisma client
echo "[3/6] Generating Prisma client..."
npx prisma generate

# Build TypeScript
echo "[4/6] Building application..."
npm run build

# Run database migrations
echo "[5/6] Running database migrations..."
npx prisma migrate deploy

# Reload PM2
echo "[6/6] Reloading PM2..."
pm2 reload edutech-api --update-env

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
pm2 status
