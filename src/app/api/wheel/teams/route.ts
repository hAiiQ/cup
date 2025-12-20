import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_TEAMS, getDefaultTeamName } from '@/lib/teamDefaults'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const ensureDefaultTeamsExist = async () => {
  const existingTeams = await prisma.team.findMany({
    select: { position: true }
  })

  const takenPositions = new Set(
    existingTeams
      .map(team => team.position)
      .filter((position): position is number => typeof position === 'number' && position > 0)
  )

  const missingPositions: number[] = []
  for (let position = 1; position <= MAX_TEAMS; position++) {
    if (!takenPositions.has(position)) {
      missingPositions.push(position)
    }
  }

  if (missingPositions.length === 0) {
    return
  }

  for (const position of missingPositions) {
    await prisma.team.create({
      data: {
        name: getDefaultTeamName(position),
        position
      }
    })
  }
}

export async function GET() {
  try {
    console.log('🎯 Fetching teams for wheel (public test)')

    await ensureDefaultTeamsExist()

    // Get all teams with member count
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        users: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        position: 'asc'
      }
    })

    // Format teams with member count
    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      position: team.position ?? 0,
      memberCount: team.users.length
    }))

    console.log(`📊 Found ${formattedTeams.length} teams`)
    
    return NextResponse.json(formattedTeams)
  } catch (error) {
    console.error('❌ Error fetching teams:', error)
    return NextResponse.json(
      { error: 'Fehler beim Laden der Teams', details: error },
      { status: 500 }
    )
  }
}
