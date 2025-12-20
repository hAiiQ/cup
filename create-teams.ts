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

    for (const team of teams) {
      await prisma.team.create({
        data: team
      })
    }

    // Create initial quarter-final matches with teams
    await prisma.match.deleteMany() // Clear existing matches

    const initialMatches = [
      {
        id: 'wb-qf-1',
        bracket: 'winner',
        round: 1,
        matchNumber: 1,
        team1Id: 'team-alpha',
        team2Id: 'team-beta'
      },
      {
        id: 'wb-qf-2',
        bracket: 'winner',
        round: 1,
        matchNumber: 2,
        team1Id: 'team-gamma',
        team2Id: 'team-delta'
      },
      {
        id: 'wb-qf-3',
        bracket: 'winner',
        round: 1,
        matchNumber: 3,
        team1Id: 'team-echo',
        team2Id: 'team-foxtrot'
      },
      {
        id: 'wb-qf-4',
        bracket: 'winner',
        round: 1,
        matchNumber: 4,
        team1Id: 'team-golf',
        team2Id: 'team-hotel'
      }
    ]

    for (const match of initialMatches) {
      await prisma.match.create({
        data: match
      })
    }

    console.log('✅ Teams and initial matches created successfully!')
    console.log('Teams:', teams.map(t => t.name).join(', '))
    
  } catch (error) {
    console.error('❌ Error creating teams:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTeams()
