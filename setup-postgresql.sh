#!/bin/bash

echo "🐘 Setting up PostgreSQL for Tournament Portal"
echo "=============================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "🚀 Starting PostgreSQL container..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

echo "🔄 Running Prisma migrations..."
npx prisma db push

echo "🌱 Seeding database..."
npx prisma db seed

echo "✅ PostgreSQL setup complete!"
echo ""
echo "🔗 Connection details:"
echo "   Host: localhost"
echo "   Port: 5432" 
echo "   Database: tournament_db"
echo "   Username: tournament_user"
echo "   Password: tournament_password"
echo ""
echo "🎯 Next steps:"
echo "   1. Run: npm run dev"
echo "   2. Visit: http://localhost:3000"
echo "   3. Admin login: admin / rootmr"
