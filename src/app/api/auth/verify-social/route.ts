import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

interface SocialAccounts {
  twitch?: string
  instagram?: string
  discord?: string
}


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { token, socialAccounts } = await request.json() as {
      token: string
      socialAccounts: SocialAccounts
    }

    // Verify JWT token
    let userId: string
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any
      userId = decoded.userId
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isVerified) {
      return NextResponse.json({ 
        success: true, 
        message: 'Account bereits verifiziert',
        alreadyVerified: true 
      })
    }

    // Save social media accounts and mark as pending verification
    await prisma.user.update({
      where: { id: userId },
      data: { 
        twitchName: socialAccounts.twitch,
        instagramName: socialAccounts.instagram,
        discordName: socialAccounts.discord,
        // User bleibt isVerified: false - Admin muss manuell verifizieren
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Social Media Accounts gespeichert! Ein Administrator wird deine Angaben prüfen und dich manuell verifizieren.',
      pendingVerification: true
    })

  } catch (error) {
    console.error('Social verification error:', error)
    return NextResponse.json({ 
      error: 'Internal server error'
    }, { status: 500 })
  }
}
