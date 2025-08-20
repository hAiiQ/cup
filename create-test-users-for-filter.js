const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createMoreTestUsers() {
  try {
    const hashedPassword = await bcrypt.hash('test123', 10)
    
    // Erstelle mehr Test-User für bessere Demo
    const testUsers = [
      {
        username: 'StreamerKing',
        inGameName: 'KingGamer',
        tier: 'tier1',
        isStreamer: true,
        isVerified: true
      },
      {
        username: 'StreamerQueen',
        inGameName: 'QueenGamer',
        tier: 'tier2',
        isStreamer: true,
        isVerified: true
      },
      {
        username: 'NormalPlayer1',
        inGameName: 'Player1',
        tier: 'tier1',
        isStreamer: false,
        isVerified: true
      },
      {
        username: 'NormalPlayer2',
        inGameName: 'Player2',
        tier: 'tier3',
        isStreamer: false,
        isVerified: true
      }
    ]
    
    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: {
          ...userData,
          password: hashedPassword,
          rulesAccepted: true,
          inGameNameVerified: true,
          inGameRankVerified: true
        }
      })
      
      console.log(`✅ ${user.username} erstellt - Streamer: ${user.isStreamer}, Tier: ${user.tier}`)
    }
    
    // Zeige Statistiken
    const streamers = await prisma.user.count({ where: { isStreamer: true } })
    const nonStreamers = await prisma.user.count({ where: { isStreamer: false } })
    
    console.log('\n📊 Streamer-Statistiken:')
    console.log(`🎥 Streamer: ${streamers}`)
    console.log(`👤 Normale User: ${nonStreamers}`)
    
  } catch (error) {
    console.error('❌ Fehler:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMoreTestUsers()
