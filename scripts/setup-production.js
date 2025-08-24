const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function setupProduction() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Starting production database setup...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('rootmr', 10);
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: { password: hashedPassword },
      create: {
        username: 'admin',
        password: hashedPassword
      }
    });
    console.log('✅ Admin user created');
    
    // Create default teams
    console.log('Creating default teams...');
    const teamNames = [
      'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
      'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta'
    ];
    
    for (let i = 0; i < teamNames.length; i++) {
      const teamName = teamNames[i];
      await prisma.team.upsert({
        where: { name: teamName },
        update: {},
        create: { 
          name: teamName,
          position: i
        }
      });
    }
    console.log('✅ Default teams created');
    
    // Create tournament bracket matches
    console.log('Creating tournament matches...');
    const teams = await prisma.team.findMany();
    if (teams.length >= 8) {
      // Winner bracket round 1
      for (let i = 0; i < 4; i++) {
        await prisma.match.upsert({
          where: { 
            round_bracketType: {
              round: `winner_round_1_match_${i + 1}`,
              bracketType: 'winner'
            }
          },
          update: {},
          create: {
            round: `winner_round_1_match_${i + 1}`,
            bracketType: 'winner',
            homeTeamId: teams[i * 2].id,
            awayTeamId: teams[i * 2 + 1].id,
          }
        });
      }
      console.log('✅ Tournament bracket created');
    }
    
    console.log('🎉 Production database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Production setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  setupProduction().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = setupProduction;
