const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function assignStreamerToTeam() {
  try {
    // Find the TestStreamer user
    const user = await prisma.user.findUnique({
      where: { username: 'TestStreamer' }
    })
    
    if (!user) {
      console.log('❌ TestStreamer nicht gefunden')
      return
    }
    
    // Find Alpha team
    const team = await prisma.team.findFirst({
      where: { name: 'Alpha' }
    })
    
    if (!team) {
      console.log('❌ Team Alpha nicht gefunden')
      return
    }
    
    // Remove any existing team membership
    await prisma.teamMember.deleteMany({
      where: { userId: user.id }
    })
    
    // Add to Alpha team
    await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: team.id,
        role: 'member'
      }
    })
    
    console.log('✅ TestStreamer wurde Team Alpha zugewiesen')
    console.log('🎥 Streamer Status:', user.isStreamer)
    console.log('🏆 Team:', team.name)
    
  } catch (error) {
    console.error('❌ Fehler:', error)
  } finally {
    await prisma.$disconnect()
  }
}

assignStreamerToTeam()
