import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings } from '@/lib/bracketSettings'
import { ensureParticipationSchema } from '@/lib/participation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const getUserId = (request: NextRequest) => {
  const bearerToken = request.headers.get('authorization')?.replace('Bearer ', '').trim()
  const token = bearerToken || request.cookies.get('token')?.value
  return token ? verifyToken(token)?.userId : undefined
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request)
    if (!userId || userId.startsWith('admin_')) {
      return NextResponse.json({ open: false, participating: false }, { status: 401 })
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
      return NextResponse.json({ open: false, participating: false }, { status: 404 })
    }

    return NextResponse.json({
      open: settings.participationOpen,
      participating: user.isParticipating,
    })
  } catch (error) {
    console.error('Participation status error:', error)
    return NextResponse.json({ open: false, participating: false }, { status: 500 })
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
    if (!settings.participationOpen) {
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
      message: 'Deine Teilnahme wurde bestätigt.',
    })
  } catch (error) {
    console.error('Participation confirmation error:', error)
    return NextResponse.json({ error: 'Teilnahme konnte nicht bestätigt werden.' }, { status: 500 })
  }
}
