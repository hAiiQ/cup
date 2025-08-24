import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Emergency admin password update endpoint
export async function POST(request: NextRequest) {
  try {
    const { newPassword, adminKey } = await request.json()
    
    // Simple security check
    if (adminKey !== 'emergency-update-key-2024' && adminKey !== process.env.ADMIN_UPDATE_KEY) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!newPassword) {
      return NextResponse.json(
        { error: 'New password is required' },
        { status: 400 }
      )
    }
    
    console.log('🔄 Updating admin password in production database...')
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update all admin passwords
    const result = await prisma.admin.updateMany({
      data: {
        password: hashedPassword
      }
    })
    
    console.log(`✅ Updated ${result.count} admin passwords`)
    
    return NextResponse.json({
      message: 'Admin password updated successfully',
      updatedCount: result.count,
      newPassword: newPassword
    })
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error)
    return NextResponse.json(
      { error: 'Failed to update admin password: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}

// Allow GET for testing
export async function GET() {
  return NextResponse.json({
    message: 'Admin password update endpoint is available',
    usage: 'POST with { newPassword, adminKey }'
  })
}
