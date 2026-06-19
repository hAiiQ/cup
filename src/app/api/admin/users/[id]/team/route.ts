import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TEAM_PLAYER_LIMIT } from '@/lib/teamCapacity'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id
    const { teamName } = await request.json()

    console.log(`🔄 Admin assigning user ${userId} to team: ${teamName}`)

    // RENDER FIX: Use direct teamId assignment instead of TeamMember table
    
    if (teamName && teamName !== '') {
      // Check if team exists by the selected admin-facing team name.
      let team = await prisma.team.findFirst({
        where: { name: teamName }
      })

      // If not found, try with "Team " prefix
      if (!team && !teamName.startsWith('Team ')) {
        team = await prisma.team.findFirst({
          where: { name: `Team ${teamName}` }
        })
      }

      if (!team) {
        console.log(`❌ Team not found: ${teamName}`)
        return NextResponse.json({ error: 'Team nicht gefunden' }, { status: 404 })
      }

      const [user, teamMemberCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: { teamId: true },
        }),
        prisma.user.count({ where: { teamId: team.id } }),
      ])

      if (!user) {
        return NextResponse.json({ error: 'User nicht gefunden' }, { status: 404 })
      }

      if (user.teamId !== team.id && teamMemberCount >= TEAM_PLAYER_LIMIT) {
        return NextResponse.json(
          { error: `Team ist bereits voll (${TEAM_PLAYER_LIMIT}/${TEAM_PLAYER_LIMIT} Mitglieder)` },
          { status: 400 }
        )
      }

      // Update user with teamId directly
      await prisma.user.update({
        where: { id: userId },
        data: { teamId: team.id }
      })

      console.log(`✅ User ${userId} assigned to team ${teamName} (${team.id})`)
    } else {
      // Remove user from team
      await prisma.user.update({
        where: { id: userId },
        data: { teamId: null }
      })

      console.log(`✅ User ${userId} removed from team`)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Team-Zuweisung erfolgreich aktualisiert'
    })
  } catch (error) {
    console.error('Error updating team assignment:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren der Team-Zuweisung' },
      { status: 500 }
    )
  }
}
