import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { verifyDiscordMembership, verifyTwitchFollow } from '@/lib/socialVerification'
import { fetchValorantRank, HenrikApiError } from '@/lib/henrikValorant'
import { MIN_VALORANT_LEVEL } from '@/lib/valorantRequirements'

export const dynamic = 'force-dynamic'

function normalizeTwitchLogin(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const {
      password,
      inGameName,
      inGameRank,
      discordName,
      twitchName,
      instagramName,
      tiktokName,
    } = await request.json()

    const twitchUsername =
      typeof twitchName === 'string' ? twitchName.trim().replace(/^@/, '') : ''
    const normalizedTwitchUsername = normalizeTwitchLogin(twitchUsername)
    const plainPassword = typeof password === 'string' ? password : ''
    const trimmedInGameName = typeof inGameName === 'string' ? inGameName.trim() : ''
    const trimmedInGameRank = typeof inGameRank === 'string' ? inGameRank.trim() : ''
    const trimmedDiscordName = typeof discordName === 'string' ? discordName.trim() : ''
    const trimmedInstagramName =
      typeof instagramName === 'string' ? instagramName.trim().replace(/^@/, '') : ''
    const trimmedTikTokName =
      typeof tiktokName === 'string' ? tiktokName.trim().replace(/^@/, '') : ''

    if (!normalizedTwitchUsername || !plainPassword) {
      return NextResponse.json(
        { error: 'Twitch Name und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    if (!trimmedInGameName) {
      return NextResponse.json(
        { error: 'Spielername ist erforderlich' },
        { status: 400 }
      )
    }

    const hashIndex = trimmedInGameName.indexOf('#')
    const valorantName = trimmedInGameName.slice(0, hashIndex).trim()
    const valorantTag = trimmedInGameName.slice(hashIndex + 1).trim()

    if (hashIndex === -1 || !valorantName || !valorantTag) {
      return NextResponse.json(
        { error: 'Bitte gib deinen In-Game Namen im Format Name#Tag ein' },
        { status: 400 }
      )
    }

    let valorantLookup: Awaited<ReturnType<typeof fetchValorantRank>>
    try {
      valorantLookup = await fetchValorantRank(valorantName, valorantTag)
    } catch (error) {
      if (error instanceof HenrikApiError) {
        return NextResponse.json(
          { error: error.message },
          { status: error.status }
        )
      }

      throw error
    }

    const valorantLevel = valorantLookup.accountLevel
    if (typeof valorantLevel !== 'number') {
      return NextResponse.json(
        { error: 'Valorant-Level konnte nicht abgerufen werden. Bitte versuche es später erneut.' },
        { status: 502 }
      )
    }

    if (valorantLevel < MIN_VALORANT_LEVEL) {
      return NextResponse.json(
        {
          error: `Dein Valorant Account muss mindestens Level ${MIN_VALORANT_LEVEL} sein. Aktuelles Level: ${valorantLevel}.`,
        },
        { status: 400 }
      )
    }

    if (!trimmedDiscordName || !trimmedInstagramName || !trimmedTikTokName) {
      return NextResponse.json(
        { error: 'Twitch, Discord, Instagram und TikTok sind erforderlich' },
        { status: 400 }
      )
    }

    if (plainPassword.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein' },
        { status: 400 }
      )
    }

    const existingUsers = await prisma.user.findMany({
      select: {
        username: true,
        twitchName: true,
      },
    })
    const twitchAlreadyRegistered = existingUsers.some((user) => {
      return (
        normalizeTwitchLogin(user.username) === normalizedTwitchUsername ||
        normalizeTwitchLogin(user.twitchName || '') === normalizedTwitchUsername
      )
    })

    if (twitchAlreadyRegistered) {
      return NextResponse.json(
        { error: 'Dieser Twitch Name ist bereits registriert' },
        { status: 400 }
      )
    }

    const [twitchVerification, discordVerification] = await Promise.all([
      verifyTwitchFollow(twitchUsername),
      verifyDiscordMembership(trimmedDiscordName),
    ])

    if (!twitchVerification.verified) {
      return NextResponse.json(
        { error: `Twitch-Verifikation fehlgeschlagen: ${twitchVerification.message}` },
        { status: 400 }
      )
    }

    if (!discordVerification.verified) {
      return NextResponse.json(
        { error: `Discord-Verifikation fehlgeschlagen: ${discordVerification.message}` },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(plainPassword)

    const user = await prisma.user.create({
      data: {
        username: normalizedTwitchUsername,
        password: hashedPassword,
        inGameName: trimmedInGameName,
        inGameRank: valorantLookup.rank || trimmedInGameRank,
        valorantLevel,
        discordName: trimmedDiscordName,
        twitchName: twitchUsername,
        instagramName: trimmedInstagramName,
        tiktokName: trimmedTikTokName,
        twitchVerified: true,
        discordVerified: true,
        instagramVerified: false,
        tiktokVerified: false,
        rulesAccepted: true,
      },
    })

    const token = generateToken(user.id)

    const response = NextResponse.json({
      message: 'Registrierung erfolgreich',
      token,
      user: {
        id: user.id,
        username: user.username,
        inGameName: user.inGameName,
        inGameRank: user.inGameRank,
        valorantLevel: user.valorantLevel,
        discordName: user.discordName,
        twitchName: user.twitchName,
        instagramName: user.instagramName,
        tiktokName: user.tiktokName,
        isVerified: user.isVerified,
        twitchVerified: user.twitchVerified,
        discordVerified: user.discordVerified,
        instagramVerified: user.instagramVerified,
        tiktokVerified: user.tiktokVerified,
        rulesAccepted: user.rulesAccepted,
      },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error('Registration error:', error)

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Dieser Twitch Name ist bereits registriert' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
