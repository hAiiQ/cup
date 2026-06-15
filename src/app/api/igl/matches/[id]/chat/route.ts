import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureMatchChatSchema } from '@/lib/matchChat'
import {
  findMatchForTeam,
  getAuthenticatedIglUser,
  loadIglBracketData,
} from '@/lib/iglMatches'

export const dynamic = 'force-dynamic'

const MAX_MESSAGE_LENGTH = 500
const MESSAGE_COOLDOWN_MS = 1000

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedIglUser(request)

    if (!user?.teamId || !user.team) {
      return NextResponse.json({ error: 'Nur IGLs eines Teams können schreiben.' }, { status: 403 })
    }

    const matchId = params.id
    const data = await loadIglBracketData()
    const ownMatch = findMatchForTeam([...data.groupMatches, ...data.matches], matchId, user.teamId)

    if (!ownMatch) {
      return NextResponse.json({ error: 'Du gehörst nicht zu diesem Match.' }, { status: 403 })
    }

    if (!ownMatch.match.isLive || ownMatch.match.isFinished || ownMatch.match.autoAdvance) {
      return NextResponse.json({ error: 'Der Chat ist nur während des Live-Matches geöffnet.' }, { status: 409 })
    }

    const body = await request.json().catch(() => ({}))
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!message) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein.' }, { status: 400 })
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Nachrichten dürfen maximal ${MAX_MESSAGE_LENGTH} Zeichen lang sein.` },
        { status: 400 }
      )
    }

    await ensureMatchChatSchema()

    const latestMessage = await prisma.matchChatMessage.findFirst({
      where: {
        matchId,
        senderUserId: user.id,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    if (latestMessage && Date.now() - latestMessage.createdAt.getTime() < MESSAGE_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Bitte warte kurz vor der nächsten Nachricht.' },
        { status: 429 }
      )
    }

    const chatMessage = await prisma.matchChatMessage.create({
      data: {
        matchId,
        senderUserId: user.id,
        senderTeamId: user.teamId,
        senderName: user.twitchName || user.username,
        senderTeamName: user.team.name,
        message,
      },
    })

    return NextResponse.json({ success: true, message: chatMessage })
  } catch (error) {
    console.error('IGL match chat error:', error)
    return NextResponse.json({ error: 'Nachricht konnte nicht gesendet werden.' }, { status: 500 })
  }
}
