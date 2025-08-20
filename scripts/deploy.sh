#!/bin/bash

# Deployment script for Render
echo "🚀 Starting deployment..."

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
    echo "📦 Production build detected"
    
    # Use PostgreSQL schema for production
    cp prisma/schema.production.prisma prisma/schema.prisma
    echo "✅ Using PostgreSQL schema"
    
    # Generate Prisma client
    npx prisma generate
    echo "✅ Prisma client generated"
    
    # Run migrations
    npx prisma migrate deploy
    echo "✅ Database migrations applied"
    
else
    echo "🛠️ Development build"
    # Keep SQLite schema for development
fi

# Build Next.js application
npm run build
echo "✅ Next.js build completed"

echo "🎉 Deployment finished!"
