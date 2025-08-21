// Manual database setup for production
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
  const prisma = new PrismaClient();
  
  console.log('🔄 Starting database setup...');
  
  try {
    // Try to create tables manually using raw SQL
    console.log('📝 Creating User table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "inGameName" TEXT,
        "inGameRank" TEXT,
        "discordName" TEXT,
        "twitchName" TEXT,
        "instagramName" TEXT,
        "tier" TEXT,
        "isStreamer" BOOLEAN NOT NULL DEFAULT false,
        "isVerified" BOOLEAN NOT NULL DEFAULT false,
        "rulesAccepted" BOOLEAN NOT NULL DEFAULT false,
        "twitchVerified" BOOLEAN NOT NULL DEFAULT false,
        "instagramVerified" BOOLEAN NOT NULL DEFAULT false,
        "discordVerified" BOOLEAN NOT NULL DEFAULT false,
        "teamId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('📝 Creating Team table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Team" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "isLive" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('📝 Creating Admin table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Admin" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    console.log('📝 Creating Match table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Match" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "round" TEXT NOT NULL,
        "bracketType" TEXT NOT NULL,
        "homeTeamId" TEXT,
        "awayTeamId" TEXT,
        "winnerId" TEXT,
        "isCompleted" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE("round", "bracketType")
      );
    `;
    
    // Create foreign key constraints
    console.log('🔗 Adding foreign key constraints...');
    await prisma.$executeRaw`
      ALTER TABLE "User" 
      ADD CONSTRAINT IF NOT EXISTS "User_teamId_fkey" 
      FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Match" 
      ADD CONSTRAINT IF NOT EXISTS "Match_homeTeamId_fkey" 
      FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Match" 
      ADD CONSTRAINT IF NOT EXISTS "Match_awayTeamId_fkey" 
      FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "Match" 
      ADD CONSTRAINT IF NOT EXISTS "Match_winnerId_fkey" 
      FOREIGN KEY ("winnerId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    `;
    
    console.log('✅ Tables created successfully!');
    
    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: { password: hashedPassword },
      create: {
        username: 'admin',
        password: hashedPassword
      }
    });
    console.log('✅ Admin user created: admin/admin123');
    
    // Create default teams
    console.log('🏆 Creating default teams...');
    const teamNames = [
      'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
      'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta'
    ];
    
    for (const teamName of teamNames) {
      await prisma.team.upsert({
        where: { name: teamName },
        update: {},
        create: { name: teamName }
      });
    }
    console.log('✅ Default teams created');
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Export for use in other scripts
module.exports = setupDatabase;

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('✅ Setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}
