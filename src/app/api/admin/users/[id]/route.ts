import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is in any team
    if (user.teamMemberships.length > 0) {
      return NextResponse.json({ 
        error: 'User ist in einem Team und kann nicht gelöscht werden. Entferne den User zuerst aus dem Team.' 
      }, { status: 400 })
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ 
      success: true, 
      message: `User ${user.username} wurde erfolgreich gelöscht.` 
    })

  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ 
      error: 'Internal server error beim Löschen des Users' 
    }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const userId = id
    const { isVerified } = await request.json()

    // Update user verification status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isVerified }
    })

    return NextResponse.json({ 
      success: true, 
      user: updatedUser 
    })

  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ 
      error: 'Internal server error beim Aktualisieren des Users' 
    }, { status: 500 })
  }
}
