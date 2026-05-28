import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

function normalizeLoginName(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase()
}

export async function POST(request: NextRequest) {
  try {
    const { twitchName, username, password } = await request.json()
    const loginInput = typeof twitchName === 'string' ? twitchName : username
    const loginName = typeof loginInput === 'string' ? normalizeLoginName(loginInput) : ''
    const plainPassword = typeof password === 'string' ? password : ''

    // Validation
    if (!loginName || !plainPassword) {
      return NextResponse.json(
        { error: 'Twitch Name und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    // Find user (case-insensitive search)
    const allUsers = await prisma.user.findMany()
    const user = allUsers.find(u =>
      normalizeLoginName(u.username) === loginName ||
      normalizeLoginName(u.twitchName || '') === loginName
    )

    if (!user) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(plainPassword, user.password)
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Ungültige Anmeldedaten' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateToken(user.id)

    // Set cookie
    const response = NextResponse.json({
      message: 'Anmeldung erfolgreich',
      token: token, // Token auch im Response für localStorage
      user: {
        id: user.id,
        username: user.username,
        isVerified: user.isVerified,
        rulesAccepted: user.rulesAccepted,
        inGameName: user.inGameName,
        inGameRank: user.inGameRank,
        valorantLevel: user.valorantLevel,
        valorantCurrentRank: user.valorantCurrentRank,
        tier: user.tier
      }
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
