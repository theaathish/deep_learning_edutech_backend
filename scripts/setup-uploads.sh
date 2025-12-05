#!/bin/bash

# Setup uploads directory structure for media storage
# Run this script once to initialize the uploads folder on the VM

set -e

UPLOAD_PATH="${UPLOAD_PATH:-.}/uploads"

echo "Setting up uploads directory at: $UPLOAD_PATH"

# Create main uploads directory
mkdir -p "$UPLOAD_PATH"

# Create subdirectories for different file types
mkdir -p "$UPLOAD_PATH/images"
mkdir -p "$UPLOAD_PATH/videos"
mkdir -p "$UPLOAD_PATH/documents"
mkdir -p "$UPLOAD_PATH/thumbnails"
mkdir -p "$UPLOAD_PATH/proofs"

# Set permissions (755 for directories, allow read/write)
chmod -R 755 "$UPLOAD_PATH"

# Create a .gitkeep file in each directory to ensure they're tracked in git
touch "$UPLOAD_PATH/.gitkeep"
touch "$UPLOAD_PATH/images/.gitkeep"
touch "$UPLOAD_PATH/videos/.gitkeep"
touch "$UPLOAD_PATH/documents/.gitkeep"
touch "$UPLOAD_PATH/thumbnails/.gitkeep"
touch "$UPLOAD_PATH/proofs/.gitkeep"

echo "✅ Uploads directory structure created successfully!"
echo "   - $UPLOAD_PATH/images"
echo "   - $UPLOAD_PATH/videos"
echo "   - $UPLOAD_PATH/documents"
echo "   - $UPLOAD_PATH/thumbnails"
echo "   - $UPLOAD_PATH/proofs"
echo ""
echo "Max file sizes:"
echo "   - Videos: 500MB"
echo "   - Images: 10MB"
echo "   - Documents: 100MB"
