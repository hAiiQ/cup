#!/bin/bash

# This script switches to production database configuration
echo "🔄 Switching to production database..."

# Backup current schema
cp prisma/schema.prisma prisma/schema.dev.prisma

# Use production schema
cp prisma/schema.production.prisma prisma/schema.prisma

echo "✅ Production schema activated"
echo "📝 Don't forget to set DATABASE_URL environment variable on Render!"
echo "🔗 Example: postgresql://user:password@host:port/database"
