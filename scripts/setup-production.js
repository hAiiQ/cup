const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function setupProduction() {
  const prisma = new PrismaClient();

  try {
    console.log('🚀 Starting production database setup...');
    console.log('Database URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

    await prisma.$connect();
    console.log('✅ Database connection successful');

    const hashedPassword = await bcrypt.hash('rootmr', 12);
    await prisma.admin.upsert({
      where: { username: 'admin' },
      update: { password: hashedPassword },
      create: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
      },
    });
    console.log('✅ Admin user ready (admin / rootmr)');

    const defaultTeams = [
      'Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta',
      'Team Echo', 'Team Foxtrot', 'Team Golf', 'Team Hotel',
    ];

    for (let i = 0; i < defaultTeams.length; i++) {
      await prisma.team.upsert({
        where: { position: i },
        update: { name: defaultTeams[i] },
        create: {
          name: defaultTeams[i],
          position: i,
        },
      });
    }
    console.log(`✅ ${defaultTeams.length} default teams created`);

    const [adminCount, userCount, teamCount] = await Promise.all([
      prisma.admin.count(),
      prisma.user.count(),
      prisma.team.count(),
    ]);
    console.log(`📊 DB state: ${adminCount} admins, ${userCount} users, ${teamCount} teams`);
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
