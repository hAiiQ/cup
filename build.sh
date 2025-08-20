#!/bin/bash

# Render.com Build Script

echo "🚀 Starting Render build..."

# Set environment
export NODE_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate Prisma client for PostgreSQL
echo "🔗 Generating Prisma client..."
npx prisma generate

# Build Next.js app
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"
