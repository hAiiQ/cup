import { PrismaClient } from '@prisma/client'
import { DEFAULT_TEAM_NAMES } from './src/lib/teamDefaults'

const prisma = new PrismaClient()

async function createTeams() {
  try {
    // Delete existing teams first
    await prisma.team.deleteMany()
    
    // Create the tournament teams (10 slots)
    const teams = DEFAULT_TEAM_NAMES.map((name, index) => ({
      id: `team-${index + 1}`,
      name,
      position: index + 1
    }))

    await prisma.team.createMany({ data: teams })

    // Reset matches for a clean bracket slate
    await prisma.match.deleteMany()

    console.log('✅ Teams recreated and matches cleared!')
    console.log('Teams:', teams.map(t => t.name).join(', '))
    
  } catch (error) {
    console.error('❌ Error creating teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTeams()
