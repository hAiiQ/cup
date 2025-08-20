const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createTestStreamer() {
  try {
    // Erstelle einen Test-User mit Streamer Status
    const hashedPassword = await bcrypt.hash('test123', 10)
    
    const testUser = await prisma.user.create({
      data: {
        username: 'TestStreamer',
        password: hashedPassword,
        inGameName: 'StreamerPlayer',
        inGameRank: 'Diamond',
        twitchName: 'teststreamer',
        tier: 'tier1',
        isStreamer: true,
        isVerified: true,
        rulesAccepted: true,
        twitchVerified: true,
        inGameNameVerified: true,
        inGameRankVerified: true
      }
    })
    
    console.log('✅ Test Streamer erstellt:', testUser.username)
    console.log('🎥 Streamer Status:', testUser.isStreamer)
    console.log('🏆 Tier:', testUser.tier)
    
    // Erstelle auch einen normalen User zum Vergleich
    const normalUser = await prisma.user.create({
      data: {
        username: 'NormalUser',
        password: hashedPassword,
        inGameName: 'NormalPlayer',
        inGameRank: 'Gold',
        tier: 'tier2',
        isStreamer: false,
        isVerified: true,
        rulesAccepted: true,
        inGameNameVerified: true,
        inGameRankVerified: true
      }
    })
    
    console.log('✅ Normal User erstellt:', normalUser.username)
    console.log('🎥 Streamer Status:', normalUser.isStreamer)
    console.log('🏆 Tier:', normalUser.tier)
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Test-User:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestStreamer()
