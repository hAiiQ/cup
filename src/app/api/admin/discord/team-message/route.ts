import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import {
  isDiscordMessagingConfigured,
  sendDiscordDirectMessages,
} from '@/lib/discordMessaging'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_MESSAGE_LENGTH = 2000

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

    const payload = await request.json().catch(() => ({}))
    const rawTeamIds: unknown[] = Array.isArray(payload.teamIds) ? payload.teamIds : []
    const teamIds: string[] = Array.from(new Set(
      rawTeamIds
        .filter((teamId: unknown): teamId is string => typeof teamId === 'string')
        .map((teamId) => teamId.trim())
        .filter(Boolean)
    ))
    const message = typeof payload.message === 'string' ? payload.message.trim() : ''

    if (teamIds.length === 0) {
      return NextResponse.json({ error: 'Wähle mindestens ein Team aus.' }, { status: 400 })
    }
    if (!message) {
      return NextResponse.json({ error: 'Die Nachricht darf nicht leer sein.' }, { status: 400 })
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Die Nachricht darf maximal ${MAX_MESSAGE_LENGTH} Zeichen lang sein.` },
        { status: 400 }
      )
    }

    const selectedTeams = await prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: {
        id: true,
        name: true,
        users: {
          select: {
            id: true,
            discordName: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    })

    if (selectedTeams.length === 0) {
      return NextResponse.json({ error: 'Die ausgewählten Teams wurden nicht gefunden.' }, { status: 404 })
    }

    const recipientsById = new Map(
      selectedTeams.flatMap((team) => team.users).map((user) => [user.id, user])
    )
    const recipients = Array.from(recipientsById.values())
    if (recipients.length === 0) {
      return NextResponse.json(
        { error: 'In den ausgewählten Teams sind keine Spieler eingetragen.' },
        { status: 409 }
      )
    }

    const delivery = await sendDiscordDirectMessages(recipients, message)

    return NextResponse.json({
      success: true,
      ...delivery,
      teamCount: selectedTeams.length,
      teamNames: selectedTeams.map((team) => team.name),
      message: `${delivery.sent} DMs gesendet. ${delivery.notFound} Discord-Namen nicht gefunden, ${delivery.failed} DMs nicht zustellbar, ${delivery.missingDiscord} Spieler ohne Discord-Namen.`,
    })
  } catch (error) {
    console.error('Discord team message error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discord-Nachricht konnte nicht gesendet werden.' },
      { status: 500 }
    )
  }
}
