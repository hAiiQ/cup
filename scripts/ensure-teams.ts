import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureTeams() {
  try {
    console.log('🔄 Checking existing teams...')
    
    const existingTeams = await prisma.team.findMany()
    console.log(`📊 Found ${existingTeams.length} existing teams`)
    
    if (existingTeams.length === 0) {
      console.log('🎯 Creating default teams...')
      
      const teams = [
        { name: 'Team Alpha', position: 1, imageUrl: null },
        { name: 'Team Beta', position: 2, imageUrl: null },
        { name: 'Team Gamma', position: 3, imageUrl: null },
        { name: 'Team Delta', position: 4, imageUrl: null },
        { name: 'Team Epsilon', position: 5, imageUrl: null },
        { name: 'Team Zeta', position: 6, imageUrl: null },
        { name: 'Team Eta', position: 7, imageUrl: null },
        { name: 'Team Theta', position: 8, imageUrl: null }
      ]
      
      for (const teamData of teams) {
        await prisma.team.create({
          data: teamData
        })
        console.log(`✅ Created team: ${teamData.name}`)
      }
      
      console.log('🎉 All teams created successfully!')
    } else {
      console.log('✅ Teams already exist')
    }
    
  } catch (error) {
    console.error('❌ Error ensuring teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

ensureTeams()
