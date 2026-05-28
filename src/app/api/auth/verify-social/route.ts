import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { verifyInstagramPending, verifyTikTokPending } from '@/lib/socialVerification'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string
      socialAccounts?: {
        instagram?: string
        tiktok?: string
      }
    }

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('token')?.value
    const token = authHeader?.replace('Bearer ', '') || body.token || cookieToken
    if (!token) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Ungueltiger Token' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const socialAccounts = body.socialAccounts
    const nextInstagramName =
      typeof socialAccounts?.instagram === 'string'
        ? socialAccounts.instagram.trim().replace(/^@/, '')
        : user.instagramName || ''
    const nextTikTokName =
      typeof socialAccounts?.tiktok === 'string'
        ? socialAccounts.tiktok.trim().replace(/^@/, '')
        : user.tiktokName || ''

    if (!nextInstagramName || !nextTikTokName) {
      return NextResponse.json(
        { error: 'Instagram und TikTok sind erforderlich.' },
        { status: 400 }
      )
    }

    const instagramChanged = (user.instagramName || '') !== nextInstagramName
    const tiktokChanged = (user.tiktokName || '') !== nextTikTokName
    const instagramResult = verifyInstagramPending(nextInstagramName)
    const tiktokResult = verifyTikTokPending(nextTikTokName)
    const instagramVerified = instagramChanged ? false : user.instagramVerified
    const tiktokVerified = tiktokChanged ? false : user.tiktokVerified
    const allVerified =
      user.twitchVerified && user.discordVerified && instagramVerified && tiktokVerified

    await prisma.user.update({
      where: { id: user.id },
      data: {
        instagramName: nextInstagramName,
        tiktokName: nextTikTokName,
        instagramVerified,
        tiktokVerified,
        isVerified: allVerified,
      },
    })

    return NextResponse.json({
      success: true,
      results: {
        twitch: {
          verified: user.twitchVerified,
          message: user.twitchVerified
            ? 'Twitch ist bereits verifiziert.'
            : 'Twitch muss bei der Registrierung verifiziert werden.',
        },
        discord: {
          verified: user.discordVerified,
          message: user.discordVerified
            ? 'Discord ist bereits verifiziert.'
            : 'Discord muss bei der Registrierung verifiziert werden.',
        },
        instagram: {
          ...instagramResult,
          verified: instagramVerified,
        },
        tiktok: {
          ...tiktokResult,
          verified: tiktokVerified,
        },
      },
      allVerified,
      autoVerified: user.twitchVerified && user.discordVerified,
      pendingManual: !instagramVerified || !tiktokVerified,
      message: allVerified
        ? 'Alle Voraussetzungen erfuellt - du bist verifiziert!'
        : 'Instagram/TikTok werden vom Admin nach dem Follow bestaetigt.',
    })
  } catch (error) {
    console.error('Social verification error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
