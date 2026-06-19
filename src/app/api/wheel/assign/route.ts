import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { TEAM_PLAYER_LIMIT } from '@/lib/teamCapacity'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { userId, teamId } = await request.json()

    if (!userId || !teamId) {
      return NextResponse.json(
        { error: 'userId und teamId sind erforderlich' },
        { status: 400 }
      )
    }

    console.log('🎯 Assigning user to team:', { userId, teamId })

    const teamMemberCount = await prisma.user.count({ where: { teamId } })
    if (teamMemberCount >= TEAM_PLAYER_LIMIT) {
      return NextResponse.json(
        { error: `Team ist bereits voll (${TEAM_PLAYER_LIMIT}/${TEAM_PLAYER_LIMIT} Mitglieder)` },
        { status: 400 }
      )
    }

    // Update user with team assignment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { teamId: teamId }
    })

    console.log('✅ User assigned to team successfully')
    
    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error('❌ Error assigning user to team:', error)
    return NextResponse.json(
      { error: 'Fehler beim Zuweisen des Benutzers zum Team', details: error },
      { status: 500 }
    )
  }
}
