import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { resetTeamsToDefaultNames } from '@/lib/teamMaintenance'
import { updateBracketSettings } from '@/lib/bracketSettings'
import { clearMatchStates } from '@/lib/matchState'

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

    const createdTeams = await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({ data: { teamId: null } })
      await tx.teamMember.deleteMany({})
      await tx.match.deleteMany({})
      return resetTeamsToDefaultNames(tx)
    })
    await updateBracketSettings({ tournamentStarted: false })
    clearMatchStates()

    return NextResponse.json({ teams: createdTeams })
  } catch (error) {
    console.error('Admin team reset error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
