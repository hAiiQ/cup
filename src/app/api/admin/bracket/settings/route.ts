import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, updateBracketSettings } from '@/lib/bracketSettings'

const SETTINGS_ENDPOINT_LOG = '[AdminBracketSettings]'

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
  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return admin
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request)

  if (!admin) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
  }

  const settings = await getBracketSettings()
  return NextResponse.json({ settings })
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)

    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    const payload = await request.json().catch(() => ({}))
    const { mode, teamSlots, tournamentStarted, groupPhaseEnabled, groupCount, activeGroupRound } = payload || {}
    const current = await getBracketSettings()
    const structureChanged =
      (teamSlots !== undefined && Number(teamSlots) !== current.teamSlots) ||
      (groupPhaseEnabled !== undefined && Boolean(groupPhaseEnabled) !== current.groupPhaseEnabled) ||
      (groupCount !== undefined && Number(groupCount) !== current.groupCount)

    if (structureChanged) {
      await prisma.$transaction([
        prisma.matchResultReport.deleteMany({
          where: { matchId: { startsWith: 'GP-' } }
        }),
        prisma.match.deleteMany({
          where: { bracket: 'group' }
        })
      ])
    }

    const updated = await updateBracketSettings({
      mode,
      teamSlots,
      tournamentStarted,
      groupPhaseEnabled,
      groupCount,
      activeGroupRound: structureChanged ? 0 : activeGroupRound,
    })
    console.log(`${SETTINGS_ENDPOINT_LOG} Updated settings`, updated)

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error(`${SETTINGS_ENDPOINT_LOG} Failed to update settings`, error)
    return NextResponse.json({ error: 'Einstellungen konnten nicht gespeichert werden.' }, { status: 500 })
  }
}
