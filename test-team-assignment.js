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
    
    // Get Alpha team
    const alphaTeam = await prisma.team.findFirst({
      where: { name: 'Alpha' }
    });
    
    if (!alphaTeam) {
      console.log('Alpha team not found');
      return;
    }
    
    console.log('Alpha team found:', alphaTeam.name, alphaTeam.id);
    
    // Assign user to Alpha team
    await prisma.teamMember.deleteMany({
      where: { userId: user.id }
    });
    
    await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: alphaTeam.id,
        role: 'member'
      }
    });
    
    console.log(`Assigned ${user.username} to ${alphaTeam.name} team`);
    
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
