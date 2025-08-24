const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkStatus() {
  try {
    const teams = await prisma.team.findMany({ orderBy: { position: 'asc' } });
    const matches = await prisma.match.findMany();
    
    console.log('🏆 Teams:', teams.length);
    teams.forEach((t, i) => console.log(`  ${i+1}. ${t.name} (pos: ${t.position})`));
    
    console.log('\n⚔️ Matches:', matches.length);
    if (matches.length > 0) {
      console.log('First 3 matches:');
      matches.slice(0, 3).forEach(m => console.log(`  ${m.id} - ${m.bracket} round ${m.round}`));
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkStatus();
