#!/bin/bash

# Production database setup script for Render.com
echo "🚀 Setting up production database..."

# Use production schema if available
if [ -f "prisma/schema.production.prisma" ]; then
    echo "📋 Using production schema..."
    cp prisma/schema.production.prisma prisma/schema.prisma
fi

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Push database schema (creates tables if they don't exist)
echo "📝 Pushing database schema..."
npx prisma db push --force-reset

# Create admin user if needed
echo "👤 Creating admin user..."
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function createAdmin() {
  const prisma = new PrismaClient();
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: hashedPassword
      }
    });
    console.log('✅ Admin user created/updated');
  } catch (error) {
    console.log('⚠️ Admin user setup:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

createAdmin();
"

echo "✅ Production setup complete!"
