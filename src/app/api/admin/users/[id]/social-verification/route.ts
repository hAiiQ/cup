import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'


// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id
    const { platform, verified } = await request.json()

    if (!['twitch', 'instagram', 'discord', 'inGameName', 'inGameRank'].includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Update specific platform verification
    const updateData: any = {}
    updateData[`${platform}Verified`] = verified

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    })

    // Check if all provided platforms are verified to update overall status
    const hasAnySocialMedia = updatedUser.twitchName || updatedUser.instagramName || updatedUser.discordName
    
    // Only require verification for platforms where user provided information
    const allProvidedPlatformsVerified = 
      (!updatedUser.twitchName || updatedUser.twitchVerified) && 
      (!updatedUser.instagramName || updatedUser.instagramVerified) && 
      (!updatedUser.discordName || updatedUser.discordVerified)

    // Update overall verification status if all provided platforms are verified
    // OR if user has no social media but has inGameName and inGameRank
    const shouldBeVerified = allProvidedPlatformsVerified && 
                            (hasAnySocialMedia || (updatedUser.inGameName && updatedUser.inGameRank))

    if (shouldBeVerified && !updatedUser.isVerified) {
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: true }
      })
    } else if (!shouldBeVerified && updatedUser.isVerified) {
      // Remove overall verification if any provided platform is unverified
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: false }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: `${platform} verification updated successfully`,
      [platform + 'Verified']: verified
    })

  } catch (error) {
    console.error('Error updating social verification:', error)
    return NextResponse.json({ 
      error: 'Internal server error beim Aktualisieren der Social Media Verifikation' 
    }, { status: 500 })
  }
}
