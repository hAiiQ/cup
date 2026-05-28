import type { Prisma, PrismaClient } from '@prisma/client'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'

type TeamClient = PrismaClient | Prisma.TransactionClient

export async function resetTeamsToDefaultNames(client: TeamClient) {
  const existingTeams = await client.team.findMany({
    orderBy: [
      { position: 'asc' },
      { createdAt: 'asc' }
    ]
  })
  const existingByPosition = new Map<number, (typeof existingTeams)[number]>()
  existingTeams.forEach((team) => {
    if (team.position >= 1 && team.position <= DEFAULT_TEAM_NAMES.length && !existingByPosition.has(team.position)) {
      existingByPosition.set(team.position, team)
    }
  })

  const usedTeamIds = new Set<string>()
  const teamsByDefaultSlot = DEFAULT_TEAM_NAMES.map((_, index) => {
    const position = index + 1
    const positionedTeam = existingByPosition.get(position)

    if (positionedTeam) {
      usedTeamIds.add(positionedTeam.id)
      return positionedTeam
    }

    const fallbackTeam = existingTeams.find((team) => !usedTeamIds.has(team.id))
    if (fallbackTeam) {
      usedTeamIds.add(fallbackTeam.id)
    }
    return fallbackTeam
  })

  for (let index = 0; index < existingTeams.length; index++) {
    const team = existingTeams[index]
    await client.team.update({
      where: { id: team.id },
      data: {
        name: `__team_reset_${index + 1}_${team.id}`,
        position: -(index + 1)
      }
    })
  }

  const defaultTeams = []

  for (let index = 0; index < DEFAULT_TEAM_NAMES.length; index++) {
    const team = teamsByDefaultSlot[index]
    const position = index + 1
    const name = DEFAULT_TEAM_NAMES[index]

    if (team) {
      const updatedTeam = await client.team.update({
        where: { id: team.id },
        data: { name, position }
      })
      defaultTeams.push(updatedTeam)
    } else {
      const createdTeam = await client.team.create({
        data: { name, position }
      })
      defaultTeams.push(createdTeam)
    }
  }

  const extraTeamIds = existingTeams
    .filter((team) => !usedTeamIds.has(team.id))
    .map((team) => team.id)

  if (extraTeamIds.length > 0) {
    await client.match.updateMany({
      where: { team1Id: { in: extraTeamIds } },
      data: { team1Id: null }
    })
    await client.match.updateMany({
      where: { team2Id: { in: extraTeamIds } },
      data: { team2Id: null }
    })
    await client.match.updateMany({
      where: { winnerId: { in: extraTeamIds } },
      data: { winnerId: null }
    })
    await client.user.updateMany({
      where: { teamId: { in: extraTeamIds } },
      data: { teamId: null }
    })
    await client.teamMember.deleteMany({
      where: { teamId: { in: extraTeamIds } }
    })
    await client.team.deleteMany({
      where: { id: { in: extraTeamIds } }
    })
  }

  return defaultTeams
}
