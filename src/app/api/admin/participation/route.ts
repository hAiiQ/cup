import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, updateBracketSettings } from '@/lib/bracketSettings'
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

const getSummary = async () => {
  const [settings, participatingCount, userCount] = await Promise.all([
    getBracketSettings(),
    prisma.user.count({ where: { isParticipating: true } }),
    prisma.user.count(),
  ])

  return {
    open: settings.participationOpen,
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
    const { action } = await request.json().catch(() => ({}))

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

    if (action !== 'open' && action !== 'close') {
      return NextResponse.json({ error: 'Ungültige Aktion.' }, { status: 400 })
    }

    await updateBracketSettings({ participationOpen: action === 'open' })

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
