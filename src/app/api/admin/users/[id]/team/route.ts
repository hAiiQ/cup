import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id
    const { teamName } = await request.json()

    // First, remove user from any existing team
    await prisma.teamMember.deleteMany({
      where: { userId }
    })

    // If teamName is provided, add user to new team
    if (teamName && teamName !== '') {
      // Find team by name
      const team = await prisma.team.findFirst({
        where: { name: teamName },
        include: {
          members: true
        }
      })

      if (!team) {
        return NextResponse.json({ error: 'Team nicht gefunden' }, { status: 404 })
      }

      // Check if team is full (max 6 members)
      if (team.members.length >= 6) {
        return NextResponse.json({ error: 'Team ist bereits voll (max. 6 Mitglieder)' }, { status: 400 })
      }

      // Add user to team
      await prisma.teamMember.create({
        data: {
          userId,
          teamId: team.id,
          role: 'member' // default role
        }
      })
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
