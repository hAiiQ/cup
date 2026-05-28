import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function ensureTeams() {
  try {
    console.log('🔄 Checking existing teams...')
    
    const existingTeams = await prisma.team.findMany()
    console.log(`📊 Found ${existingTeams.length} existing teams`)
    
    if (existingTeams.length === 0) {
      console.log('🎯 Creating default teams...')
      
      const teams = Array.from({ length: 16 }, (_, index) => ({
        name: `Team ${index + 1}`,
        position: index + 1,
        imageUrl: null
      }))
      
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
