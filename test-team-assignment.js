const { PrismaClient } = require('@prisma/client');

async function testTeamAssignment() {
  const prisma = new PrismaClient();
  
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found');
      return;
    }
    
    console.log('Test user:', user.username);
    
    // Get Team 1
    const teamOne = await prisma.team.findFirst({
      where: { name: 'Team 1' }
    });
    
    if (!teamOne) {
      console.log('Team 1 not found');
      return;
    }
    
    console.log('Team 1 found:', teamOne.name, teamOne.id);
    
    // Assign user to Team 1
    await prisma.teamMember.deleteMany({
      where: { userId: user.id }
    });
    
    await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: teamOne.id,
        role: 'member'
      }
    });
    
    console.log(`Assigned ${user.username} to ${teamOne.name}`);
    
    // Verify assignment
    const userWithTeam = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    });
    
    console.log('User team assignment:', userWithTeam.teamMemberships.map(tm => tm.team.name));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTeamAssignment();
