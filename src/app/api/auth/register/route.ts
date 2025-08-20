import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password, inGameName, inGameRank, discordName, twitchName, instagramName } = await request.json()

    // Validation
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Benutzername und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    if (!inGameName || !inGameRank) {
      return NextResponse.json(
        { error: 'Spielername und Rank sind erforderlich' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Passwort muss mindestens 6 Zeichen lang sein' },
        { status: 400 }
      )
    }

    // Check if user already exists (case-insensitive check)
    const existingUsers = await prisma.user.findMany()
    
    // Check if any existing user has the same username (case-insensitive)
    const usernameExists = existingUsers.some(user => 
      user.username.toLowerCase() === username.toLowerCase().trim()
    )

    if (usernameExists) {
      return NextResponse.json(
        { error: 'Benutzername ist bereits vergeben' },
        { status: 400 }
      )
    }

    // Hash password and create user with original case
    const hashedPassword = await hashPassword(password)
    
    const user = await prisma.user.create({
      data: {
        username: username.trim(), // Keep original case, just trim whitespace
        password: hashedPassword,
        inGameName: inGameName.trim(),
        inGameRank: inGameRank,
        discordName: discordName ? discordName.trim() : null,
        twitchName: twitchName ? twitchName.trim() : null,
        instagramName: instagramName ? instagramName.trim() : null,
        rulesAccepted: true, // Automatically set to true when registration is completed
      }
    })

    // Generate token
    const token = generateToken(user.id)

    // Set cookie
    const response = NextResponse.json({
      message: 'Registrierung erfolgreich',
      token: token, // Token auch im Response für localStorage
      user: {
        id: user.id,
        username: user.username,
        inGameName: user.inGameName,
        inGameRank: user.inGameRank,
        discordName: user.discordName,
        twitchName: user.twitchName,
        isVerified: user.isVerified,
        rulesAccepted: user.rulesAccepted
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
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
