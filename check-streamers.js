const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUsersWithStreamerStatus() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        isStreamer: true,
        tier: true,
        teamMemberships: {
          include: {
            team: true
          }
        }
      }
    })
    
    console.log('📊 Users in Datenbank:')
    users.forEach(user => {
      console.log(`- ${user.username}: Streamer=${user.isStreamer}, Tier=${user.tier}, Team=${user.teamMemberships[0]?.team.name || 'Kein Team'}`)
    })
    
    // Markiere einen User als Streamer falls keiner existiert
    if (users.length > 0 && !users.some(u => u.isStreamer)) {
      const firstUser = users[0]
      await prisma.user.update({
        where: { id: firstUser.id },
        data: { isStreamer: true }
      })
      console.log(`✅ ${firstUser.username} wurde als Streamer markiert`)
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsersWithStreamerStatus()
