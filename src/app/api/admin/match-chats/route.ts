import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { ensureMatchChatSchema } from '@/lib/matchChat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const verifyAdmin = async (request: NextRequest) => {
  const token = request.cookies.get('admin_token')?.value
  const decoded = token ? verifyToken(token) : null

  if (!decoded?.userId.startsWith('admin_')) {
    return false
  }

  const adminId = decoded.userId.replace('admin_', '')
  if (adminId === 'env_admin') {
    return true
  }

  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { id: true },
  })

  return Boolean(admin)
}

export async function GET(request: NextRequest) {
  try {
    if (!(await verifyAdmin(request))) {
      return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })
    }

    await ensureMatchChatSchema()

    const messages = await prisma.matchChatMessage.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const matchIds = Array.from(new Set(messages.map((message) => message.matchId)))
    const matches = matchIds.length > 0
      ? await prisma.match.findMany({
          where: { id: { in: matchIds } },
          select: {
            id: true,
            isLive: true,
            isFinished: true,
            mapName: true,
            team1: { select: { name: true } },
            team2: { select: { name: true } },
          },
        })
      : []
    const matchesById = new Map(matches.map((match) => [match.id, match]))
    const threadsById = new Map<string, {
      matchId: string
      isLive: boolean
      isFinished: boolean
      mapName: string | null
      team1Name: string | null
      team2Name: string | null
      messages: typeof messages
    }>()

    messages.slice().reverse().forEach((message) => {
      const storedMatch = matchesById.get(message.matchId)
      const thread = threadsById.get(message.matchId) || {
        matchId: message.matchId,
        isLive: Boolean(storedMatch?.isLive),
        isFinished: Boolean(storedMatch?.isFinished),
        mapName: storedMatch?.mapName || null,
        team1Name: storedMatch?.team1?.name || null,
        team2Name: storedMatch?.team2?.name || null,
        messages: [],
      }

      thread.messages.push(message)
      threadsById.set(message.matchId, thread)
    })

    const threads = Array.from(threadsById.values()).sort((a, b) => {
      const aTime = a.messages[a.messages.length - 1]?.createdAt.getTime() || 0
      const bTime = b.messages[b.messages.length - 1]?.createdAt.getTime() || 0
      return bTime - aTime
    })

    return NextResponse.json({
      threads,
      threadCount: threads.length,
      messageCount: messages.length,
    })
  } catch (error) {
    console.error('Admin match chats error:', error)
    return NextResponse.json({ error: 'Match-Chats konnten nicht geladen werden.' }, { status: 500 })
  }
}
