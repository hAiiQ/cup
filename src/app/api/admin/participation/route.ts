import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, isParticipationOpenNow, updateBracketSettings } from '@/lib/bracketSettings'
import { ensureParticipationSchema } from '@/lib/participation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const verifyAdmin = async (request: NextRequest) => {
  const token = request.cookies.get('admin_token')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded?.userId.startsWith('admin_')) {
    return null
  }

  const adminId = decoded.userId.replace('admin_', '')
  if (adminId === 'env_admin') {
    return { id: adminId }
  }

  return prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  })
}

const parseParticipationEndsAt = (value: unknown): Date | null | undefined => {
  if (value === null || value === '') {
    return null
  }

  if (typeof value !== 'string') {
    return undefined
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return undefined
  }

  return date
}

const getSummary = async () => {
  const [settings, participatingCount, userCount] = await Promise.all([
    getBracketSettings(),
    prisma.user.count({ where: { isParticipating: true } }),
    prisma.user.count(),
  ])

  const now = new Date()
  const participationOpen = isParticipationOpenNow(settings, now)
  const participationEndsAt = settings.participationEndsAt
  const remainingMs = participationEndsAt
    ? Math.max(participationEndsAt.getTime() - now.getTime(), 0)
    : null

  return {
    open: participationOpen,
    configuredOpen: settings.participationOpen,
    participationEndsAt: participationEndsAt?.toISOString() || null,
    participationEnded: Boolean(settings.participationOpen && participationEndsAt && remainingMs === 0),
    participationSecondsRemaining: remainingMs === null ? null : Math.floor(remainingMs / 1000),
    participatingCount,
    userCount,
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    await ensureParticipationSchema()
    return NextResponse.json(await getSummary())
  } catch (error) {
    console.error('Admin participation status error:', error)
    return NextResponse.json({ error: 'Teilnahmestatus konnte nicht geladen werden.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    await ensureParticipationSchema()
    const { action, participationEndsAt } = await request.json().catch(() => ({}))
    const parsedEndsAt = parseParticipationEndsAt(participationEndsAt)

    if (participationEndsAt !== undefined && parsedEndsAt === undefined) {
      return NextResponse.json({ error: 'Ungültige Endzeit.' }, { status: 400 })
    }

    if (action === 'reset') {
      await prisma.user.updateMany({
        data: { isParticipating: false },
      })

      return NextResponse.json({
        success: true,
        message: 'Alle Teilnahmen wurden zurückgesetzt.',
        ...(await getSummary()),
      })
    }

    if (action === 'deadline') {
      await updateBracketSettings({ participationEndsAt: parsedEndsAt ?? null })

      return NextResponse.json({
        success: true,
        message: parsedEndsAt ? 'Teilnahme-Endzeit wurde gespeichert.' : 'Teilnahme-Endzeit wurde entfernt.',
        ...(await getSummary()),
      })
    }

    if (action !== 'open' && action !== 'close') {
      return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
    }

    if (action === 'open' && parsedEndsAt && parsedEndsAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Die Endzeit muss in der Zukunft liegen.' }, { status: 400 })
    }

    await updateBracketSettings({
      participationOpen: action === 'open',
      ...(participationEndsAt !== undefined ? { participationEndsAt: parsedEndsAt ?? null } : {}),
    })

    return NextResponse.json({
      success: true,
      message: action === 'open' ? 'Teilnahme wurde geöffnet.' : 'Teilnahme wurde geschlossen.',
      ...(await getSummary()),
    })
  } catch (error) {
    console.error('Admin participation update error:', error)
    return NextResponse.json({ error: 'Teilnahme konnte nicht aktualisiert werden.' }, { status: 500 })
  }
}
