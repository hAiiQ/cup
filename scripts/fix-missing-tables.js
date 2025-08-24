const { PrismaClient } = require('@prisma/client');

async function fixMissingTables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔧 Fixing missing database tables...');
    
    // Check current tables
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `;
    
    console.log('📊 Current tables:', result);
    
    // Create TeamMember table if missing
    console.log('🛠️ Creating TeamMember table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "public"."TeamMember" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "teamId" TEXT NOT NULL,
        "role" TEXT DEFAULT 'member',
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
      );
    `;
    
    // Create indexes
    await prisma.$executeRaw`
      CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_userId_teamId_key" 
      ON "public"."TeamMember"("userId", "teamId");
    `;
    
    // Create foreign key constraints
    await prisma.$executeRaw`
      ALTER TABLE "public"."TeamMember" 
      ADD CONSTRAINT "TeamMember_userId_fkey" 
      FOREIGN KEY ("userId") REFERENCES "public"."User"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    await prisma.$executeRaw`
      ALTER TABLE "public"."TeamMember" 
      ADD CONSTRAINT "TeamMember_teamId_fkey" 
      FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `;
    
    console.log('✅ TeamMember table created successfully');
    
    // Verify the table exists
    const teamMemberCount = await prisma.teamMember.count();
    console.log(`📊 TeamMember records: ${teamMemberCount}`);
    
    console.log('🎉 Database fix completed successfully');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
    
    // Try alternative approach - force recreate all tables
    console.log('🔄 Trying alternative approach...');
    try {
      await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE;`;
      await prisma.$executeRaw`CREATE SCHEMA public;`;
      await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO tournament_user;`;
      console.log('✅ Schema recreated, please run deployment again');
    } catch (altError) {
      console.error('❌ Alternative approach failed:', altError);
    }
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixMissingTables();
}

module.exports = fixMissingTables;
