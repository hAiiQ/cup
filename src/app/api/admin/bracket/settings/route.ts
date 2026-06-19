import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, normalizeGroupTeamOrder, updateBracketSettings } from '@/lib/bracketSettings'

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
  if (adminId === 'env_admin') {
    return true
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId }
  })

  return Boolean(admin)
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
    const { mode, teamSlots, tournamentStarted, groupPhaseEnabled, groupCount, activeGroupRound, groupTeamOrder } = payload || {}
    const current = await getBracketSettings()
    const normalizedGroupTeamOrder = groupTeamOrder === undefined
      ? current.groupTeamOrder
      : normalizeGroupTeamOrder(groupTeamOrder)
    const groupOrderChanged = groupTeamOrder !== undefined && (
      normalizedGroupTeamOrder.length !== current.groupTeamOrder.length ||
      normalizedGroupTeamOrder.some((teamId, index) => teamId !== current.groupTeamOrder[index])
    )

    if (groupOrderChanged && current.activeGroupRound > 0) {
      return NextResponse.json(
        { error: 'Teams koennen nach dem Start der ersten Gruppenrunde nicht mehr getauscht werden.' },
        { status: 409 }
      )
    }

    const structureChanged =
      (teamSlots !== undefined && Number(teamSlots) !== current.teamSlots) ||
      (groupPhaseEnabled !== undefined && Boolean(groupPhaseEnabled) !== current.groupPhaseEnabled) ||
      (groupCount !== undefined && Number(groupCount) !== current.groupCount) ||
      groupOrderChanged

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
      groupTeamOrder: normalizedGroupTeamOrder,
    })
    console.log(`${SETTINGS_ENDPOINT_LOG} Updated settings`, updated)

    return NextResponse.json({ settings: updated })
  } catch (error) {
    console.error(`${SETTINGS_ENDPOINT_LOG} Failed to update settings`, error)
    return NextResponse.json({ error: 'Einstellungen konnten nicht gespeichert werden.' }, { status: 500 })
  }
}
