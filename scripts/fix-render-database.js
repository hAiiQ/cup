const { PrismaClient } = require('@prisma/client');

async function fixRenderDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing Render database...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Connected to database');
    
    // Check existing tables
    const adminCount = await prisma.admin.count().catch(() => 0);
    const userCount = await prisma.user.count().catch(() => 0);
    const teamCount = await prisma.team.count().catch(() => 0);
    
    console.log(`📊 Current state:
    - Admins: ${adminCount}
    - Users: ${userCount} 
    - Teams: ${teamCount}`);
    
    // Force reset database if needed
    console.log('🔄 Applying database schema...');
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE;`;
    await prisma.$executeRaw`CREATE SCHEMA public;`;
    await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO tournament_user;`;
    await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO public;`;
    
    console.log('✅ Database reset complete');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixRenderDatabase();
}

module.exports = fixRenderDatabase;
