import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'
import { verifyToken } from '@/lib/auth'

const MAX_TEAM_NAME_LENGTH = 40

async function verifyAdmin(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value

  if (!token) {
    return null
  }

  const decoded = verifyToken(token)
  if (!decoded || !decoded.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  const admin = await prisma.admin.findUnique({ where: { id: adminId } })

  return admin
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)

    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const requestedName = typeof payload?.name === 'string' ? payload.name.trim() : ''
    const normalizedName = requestedName.length > 0 ? requestedName : null

    const createdTeams = await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ data: { teamId: null } })
      await tx.teamMember.deleteMany({})
      await tx.match.deleteMany({})
      await tx.team.deleteMany({})

      const teams = []

      for (let index = 0; index < DEFAULT_TEAM_NAMES.length; index++) {
        const baseName = normalizedName ?? DEFAULT_TEAM_NAMES[index]
        const safeName = baseName.slice(0, MAX_TEAM_NAME_LENGTH)
        const position = index + 1

        const team = await tx.team.create({
          data: {
            id: `team-${position}`,
            name: safeName,
            position
          }
        })

        teams.push(team)
      }

      return teams
    })

    return NextResponse.json({ teams: createdTeams })
  } catch (error) {
    console.error('Admin team reset error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
