const { PrismaClient } = require('@prisma/client');

async function checkTeams() {
  const prisma = new PrismaClient();
  
  try {
    const teams = await prisma.team.findMany();
    console.log('Existing teams:', teams.map(t => ({ name: t.name, id: t.id })));
    
    if (teams.length === 0) {
      console.log('No teams found. Creating teams...');
      
      const teamNames = Array.from({ length: 16 }, (_, index) => `Team ${index + 1}`);
      
      for (let i = 0; i < teamNames.length; i++) {
        await prisma.team.create({
          data: {
            name: teamNames[i],
            position: i + 1
          }
        });
        console.log(`Created team: ${teamNames[i]}`);
      }
      
      console.log('All teams created successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTeams();
