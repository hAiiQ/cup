import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id
    const { tier } = await request.json()

    // Allow empty string for "no tier" or valid tier values
    if (tier !== '' && !['tier1', 'tier2', 'tier3'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tier: tier === '' ? null : tier },
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Tier erfolgreich aktualisiert',
      user: updatedUser 
    })
  } catch (error) {
    console.error('Error updating tier:', error)
    return NextResponse.json(
      { error: 'Fehler beim Aktualisieren des Tiers' },
      { status: 500 }
    )
  }
}
