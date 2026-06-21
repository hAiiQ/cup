import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getBracketSettings, isParticipationOpenNow } from '@/lib/bracketSettings'
import { ensureParticipationSchema } from '@/lib/participation'
import { prisma } from '@/lib/prisma'
import { isDiscordMessagingConfigured, sendDiscordDirectMessages } from '@/lib/discordMessaging'

export const dynamic = 'force-dynamic'

const PARTICIPATION_DASHBOARD_URL = 'https://summercup-bnfu.onrender.com/dashboard'

const verifyAdmin = async (request: NextRequest) => {
  const token = request.cookies.get('admin_token')?.value
  const decoded = token ? verifyToken(token) : null
  if (!decoded?.userId.startsWith('admin_')) return null

  const adminId = decoded.userId.replace('admin_', '')
  if (adminId === 'env_admin') return { id: adminId }

  return prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  })
}

export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request)
    if (!admin) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    if (!isDiscordMessagingConfigured()) {
      return NextResponse.json(
        { error: 'Discord-Bot oder Discord-Server ist nicht konfiguriert.' },
        { status: 503 }
      )
    }

    await ensureParticipationSchema()
    const settings = await getBracketSettings()
    if (!isParticipationOpenNow(settings)) {
      return NextResponse.json(
        { error: 'Die Teilnahme muss geöffnet sein, bevor Erinnerungen versendet werden.' },
        { status: 409 }
      )
    }

    const users = await prisma.user.findMany({
      where: { isParticipating: false },
      select: {
        username: true,
        discordName: true,
      },
      orderBy: { username: 'asc' },
    })

    const deadline = settings.participationEndsAt
      ? ` Die Teilnahme ist bis ${settings.participationEndsAt.toLocaleString('de-DE', {
          timeZone: 'Europe/Berlin',
          dateStyle: 'medium',
          timeStyle: 'short',
        })} Uhr geöffnet.`
      : ''
    const content = [
      'Hey! Die Teilnahme für den Summer Cup ist geöffnet.',
      'Du hast deine Teilnahme noch nicht bestätigt.',
      `Öffne ${PARTICIPATION_DASHBOARD_URL} und klicke dort auf „Teilnehmen“.${deadline}`,
      'Falls du nicht mitmachen möchtest, kannst du diese Nachricht ignorieren.',
    ].join('\n\n')

    const delivery = await sendDiscordDirectMessages(users, content)

    return NextResponse.json({
      success: true,
      ...delivery,
      message: `${delivery.sent} Erinnerungen gesendet. ${delivery.notFound} nicht gefunden, ${delivery.failed} nicht erreichbar, ${delivery.missingDiscord} ohne Discord-Namen.`,
    })
  } catch (error) {
    console.error('Discord participation reminder error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discord-Erinnerungen konnten nicht gesendet werden.' },
      { status: 500 }
    )
  }
}
