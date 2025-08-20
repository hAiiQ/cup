#!/bin/bash

# Render.com Start Script

echo "🚀 Starting Tournament Portal..."

# Run database migrations (if needed)
if [ "$NODE_ENV" = "production" ]; then
    echo "📊 Running database migrations..."
    npx prisma migrate deploy || echo "⚠️ Migration failed - database might not be ready yet"
fi

# Start the application
echo "🌐 Starting Next.js server..."
npm start
