const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const DEFAULT_TEAM_NAMES = Array.from({ length: 32 }, (_, index) => `Team ${index + 1}`);

async function resetTeamsToDefaultNames(prisma) {
  const existingTeams = await prisma.team.findMany({
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' },
    ],
  });
  const existingByPosition = new Map();
  existingTeams.forEach((team) => {
    if (team.position >= 1 && team.position <= DEFAULT_TEAM_NAMES.length && !existingByPosition.has(team.position)) {
      existingByPosition.set(team.position, team);
    }
  });

  const usedTeamIds = new Set();
  const teamsByDefaultSlot = DEFAULT_TEAM_NAMES.map((_, index) => {
    const position = index + 1;
    const positionedTeam = existingByPosition.get(position);

    if (positionedTeam) {
      usedTeamIds.add(positionedTeam.id);
      return positionedTeam;
    }

    const fallbackTeam = existingTeams.find((team) => !usedTeamIds.has(team.id));
    if (fallbackTeam) {
      usedTeamIds.add(fallbackTeam.id);
    }
    return fallbackTeam;
  });

  for (let index = 0; index < existingTeams.length; index++) {
    const team = existingTeams[index];
    await prisma.team.update({
      where: { id: team.id },
      data: {
        name: `__team_reset_${index + 1}_${team.id}`,
        position: -(index + 1),
      },
    });
  }

  for (let index = 0; index < DEFAULT_TEAM_NAMES.length; index++) {
    const team = teamsByDefaultSlot[index];
    const position = index + 1;
    const name = DEFAULT_TEAM_NAMES[index];

    if (team) {
      await prisma.team.update({
        where: { id: team.id },
        data: { name, position },
      });
    } else {
      await prisma.team.create({
        data: { name, position },
      });
    }
  }

  const extraTeamIds = existingTeams
    .filter((team) => !usedTeamIds.has(team.id))
    .map((team) => team.id);
  if (extraTeamIds.length > 0) {
    await prisma.match.updateMany({
      where: { team1Id: { in: extraTeamIds } },
      data: { team1Id: null },
    });
    await prisma.match.updateMany({
      where: { team2Id: { in: extraTeamIds } },
      data: { team2Id: null },
    });
    await prisma.match.updateMany({
      where: { winnerId: { in: extraTeamIds } },
      data: { winnerId: null },
    });
    await prisma.user.updateMany({
      where: { teamId: { in: extraTeamIds } },
      data: { teamId: null },
    });
    await prisma.teamMember.deleteMany({
      where: { teamId: { in: extraTeamIds } },
    });
    await prisma.team.deleteMany({
      where: { id: { in: extraTeamIds } },
    });
  }
}

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

    await resetTeamsToDefaultNames(prisma);

    console.log(`Default teams ready: ${DEFAULT_TEAM_NAMES.length}`);

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
