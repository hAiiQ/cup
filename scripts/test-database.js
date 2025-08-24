const { PrismaClient } = require('@prisma/client');

async function testDatabase() {
  console.log('🧪 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
  
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error']
  });
  
  try {
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Test basic queries
    console.log('Testing basic queries...');
    
    // Check tables exist
    try {
      const adminCount = await prisma.admin.count();
      console.log(`📊 Admin count: ${adminCount}`);
    } catch (e) {
      console.log('❌ Admin table error:', e.message);
    }
    
    try {
      const userCount = await prisma.user.count();
      console.log(`📊 User count: ${userCount}`);
    } catch (e) {
      console.log('❌ User table error:', e.message);
    }
    
    try {
      const teamCount = await prisma.team.count();
      console.log(`📊 Team count: ${teamCount}`);
    } catch (e) {
      console.log('❌ Team table error:', e.message);
    }
    
    // Test team creation if no teams exist
    const teams = await prisma.team.findMany();
    if (teams.length === 0) {
      console.log('🔧 Creating test team...');
      const testTeam = await prisma.team.create({
        data: {
          name: 'Test Team',
          position: 0
        }
      });
      console.log('✅ Test team created:', testTeam.name);
    }
    
    console.log('🎉 Database test completed successfully');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testDatabase();
}

module.exports = testDatabase;
