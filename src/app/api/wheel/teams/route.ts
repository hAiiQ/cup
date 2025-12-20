import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MAX_TEAMS, getDefaultTeamName, normalizeTeamName } from '@/lib/teamDefaults'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

const ensureDefaultTeamsExist = async () => {
  const existingTeams = await prisma.team.findMany({
    select: { id: true, name: true, position: true }
  })

  const positionMap = new Map<number, { id: string; name: string | null }>()
  const invalidTeams: { id: string; name: string | null; position: number | null }[] = []

  existingTeams.forEach(team => {
    if (typeof team.position === 'number' && team.position >= 1 && team.position <= MAX_TEAMS) {
      if (!positionMap.has(team.position)) {
        positionMap.set(team.position, { id: team.id, name: team.name })
      } else {
        invalidTeams.push({ id: team.id, name: team.name, position: team.position })
      }
    } else {
      invalidTeams.push({ id: team.id, name: team.name, position: team.position ?? 0 })
    }
  })

  const missingPositions: number[] = []
  for (let position = 1; position <= MAX_TEAMS; position++) {
    if (!positionMap.has(position)) {
      missingPositions.push(position)
    }
  }

  for (const team of invalidTeams) {
    const nextPosition = missingPositions.shift()
    if (!nextPosition) {
      break
    }

    await prisma.team.update({
      where: { id: team.id },
      data: {
        position: nextPosition,
        name: getDefaultTeamName(nextPosition)
      }
    })

    positionMap.set(nextPosition, { id: team.id, name: getDefaultTeamName(nextPosition) })
  }

  if (missingPositions.length > 0) {
    for (const position of missingPositions) {
      const created = await prisma.team.create({
        data: {
          name: getDefaultTeamName(position),
          position
        }
      })

      positionMap.set(position, { id: created.id, name: created.name })
    }
  }

  for (let position = 1; position <= MAX_TEAMS; position++) {
    const team = positionMap.get(position)
    if (!team) continue

    const normalizedName = normalizeTeamName(position, team.name)
    if (normalizedName !== team.name) {
      await prisma.team.update({
        where: { id: team.id },
        data: { name: normalizedName }
      })
    }
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
