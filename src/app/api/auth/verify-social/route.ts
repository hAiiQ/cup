import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import {
  verifyAllSocialAccounts,
  isFullyVerified,
  type SocialAccountsInput,
} from '@/lib/socialVerification'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      token?: string
      socialAccounts?: SocialAccountsInput
    }

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('token')?.value
    const token = authHeader?.replace('Bearer ', '') || body.token || cookieToken
    if (!token) {
      return NextResponse.json({ error: 'Nicht angemeldet' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Ungültiger Token' }, { status: 401 })
    }

    const socialAccounts = body.socialAccounts
    if (!socialAccounts?.twitch || !socialAccounts?.discord || !socialAccounts?.instagram || !socialAccounts?.tiktok) {
      return NextResponse.json(
        { error: 'Twitch, Discord, Instagram und TikTok sind erforderlich.' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 })
    }

    const results = await verifyAllSocialAccounts({
      twitch: socialAccounts.twitch.trim(),
      discord: socialAccounts.discord.trim(),
      instagram: socialAccounts.instagram.trim(),
      tiktok: socialAccounts.tiktok.trim(),
    })

    const twitchVerified = results.twitch.verified
    const discordVerified = results.discord.verified
    const instagramVerified = user.instagramVerified || results.instagram.verified
    const tiktokVerified = user.tiktokVerified || results.tiktok.verified

    const allVerified =
      twitchVerified && discordVerified && instagramVerified && tiktokVerified

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twitchName: socialAccounts.twitch.trim(),
        discordName: socialAccounts.discord.trim(),
        instagramName: socialAccounts.instagram.trim(),
        tiktokName: socialAccounts.tiktok.trim(),
        twitchVerified,
        discordVerified,
        isVerified: allVerified,
      },
    })

    return NextResponse.json({
      success: true,
      results,
      allVerified,
      autoVerified: twitchVerified && discordVerified,
      pendingManual: !instagramVerified || !tiktokVerified,
      message: allVerified
        ? 'Alle Voraussetzungen erfüllt — du bist verifiziert!'
        : twitchVerified && discordVerified
          ? 'Twitch & Discord OK. Instagram/TikTok werden vom Admin nach dem Follow bestätigt.'
          : 'Einige Prüfungen sind fehlgeschlagen. Bitte folge allen Accounts und versuche es erneut.',
    })
  } catch (error) {
    console.error('Social verification error:', error)
    return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 })
  }
}
