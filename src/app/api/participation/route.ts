import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, isParticipationOpenNow } from '@/lib/bracketSettings'
import { ensureParticipationSchema } from '@/lib/participation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const getUserId = (request: NextRequest) => {
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  const token = bearerToken || request.cookies.get('token')?.value
  return token ? verifyToken(token)?.userId : undefined
}

const closedPayload = {
  open: false,
  participating: false,
  participationEndsAt: null,
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId || userId.startsWith('admin_')) {
      return NextResponse.json(closedPayload, { status: 401 })
    }

    await ensureParticipationSchema()
    const [settings, user] = await Promise.all([
      getBracketSettings(),
      prisma.user.findUnique({
        where: { id: userId },
        select: { isParticipating: true },
      }),
    ])

    if (!user) {
      return NextResponse.json(closedPayload, { status: 404 })
    }

    return NextResponse.json({
      open: isParticipationOpenNow(settings),
      participating: user.isParticipating,
      participationEndsAt: settings.participationEndsAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('Participation status error:', error)
    return NextResponse.json(closedPayload, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId || userId.startsWith('admin_')) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    await ensureParticipationSchema()
    const settings = await getBracketSettings()
    if (!isParticipationOpenNow(settings)) {
      return NextResponse.json({ error: 'Die Teilnahme ist aktuell geschlossen.' }, { status: 409 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isParticipating: true },
      select: { isParticipating: true },
    })

    return NextResponse.json({
      success: true,
      participating: user.isParticipating,
      participationEndsAt: settings.participationEndsAt?.toISOString() || null,
      message: 'Deine Teilnahme wurde bestätigt.',
    })
  } catch (error) {
    console.error('Participation confirmation error:', error)
    return NextResponse.json({ error: 'Teilnahme konnte nicht bestätigt werden.' }, { status: 500 })
  }
}
