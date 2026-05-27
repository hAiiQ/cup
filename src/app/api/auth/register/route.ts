import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Registration attempt started');
    const { username, password, inGameName, inGameRank, discordName, twitchName, instagramName, tiktokName } = await request.json()
    console.log('📝 Registration data received:', { username, inGameName, inGameRank });

    // Validation
    if (!username || !password) {
      console.log('❌ Missing username or password');
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

    if (!twitchName?.trim() || !discordName?.trim() || !instagramName?.trim() || !tiktokName?.trim()) {
      return NextResponse.json(
        { error: 'Twitch, Discord, Instagram und TikTok sind erforderlich' },
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
    console.log('🔍 Checking existing users...');
    const existingUsers = await prisma.user.findMany()
    console.log('📊 Found', existingUsers.length, 'existing users');
    
    // Check if any existing user has the same username (case-insensitive)
    const usernameExists = existingUsers.some(user => 
      user.username.toLowerCase() === username.toLowerCase().trim()
    )

    if (usernameExists) {
      console.log('❌ Username already exists:', username);
      return NextResponse.json(
        { error: 'Benutzername ist bereits vergeben' },
        { status: 400 }
      )
    }

    // Hash password and create user with original case
    console.log('🔐 Hashing password...');
    const hashedPassword = await hashPassword(password)
    
    console.log('👤 Creating user in database...');
    const user = await prisma.user.create({
      data: {
        username: username.trim(), // Keep original case, just trim whitespace
        password: hashedPassword,
        inGameName: inGameName.trim(),
        inGameRank: inGameRank,
        discordName: discordName.trim(),
        twitchName: twitchName.trim(),
        instagramName: instagramName.trim(),
        tiktokName: tiktokName.trim(),
        rulesAccepted: true, // Automatically set to true when registration is completed
      }
    })
    console.log('✅ User created successfully:', user.id);

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
    console.error('❌ Registration error details:', error)
    console.error('❌ Registration error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('❌ Registration error message:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: 'Interner Serverfehler: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
