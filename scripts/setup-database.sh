#!/bin/bash

# Quick database setup script for production
echo "🔧 Setting up production database..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set!"
    echo "📝 Please set DATABASE_URL in your Render environment variables"
    echo "🔗 Example: postgresql://user:password@host:5432/database"
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo "🔄 Running database migrations..."

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push --force-reset

echo "✅ Database setup complete!"

# Setup admin user and initial data
node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('👤 Creating admin user...');
        const hashedPassword = await bcrypt.hash('rootmr', 10);
    
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: { password: hashedPassword },
      create: {
        username: 'admin',
        password: hashedPassword
      }
    });
    
        console.log('✅ Admin user created: admin/rootmr');
    
    // Create default teams
    const teamNames = Array.from({ length: 16 }, (_, index) => 'Team ' + (index + 1));
    
    for (let index = 0; index < teamNames.length; index++) {
      const teamName = teamNames[index];
      const position = index + 1;
      await prisma.team.upsert({
        where: { position },
        update: { name: teamName },
        create: { name: teamName, position }
      });
    }
    
    console.log('✅ Default teams created');
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
  } finally {
    await prisma.\$disconnect();
  }
}

setupDatabase();
"
