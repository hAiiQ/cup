import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// RENDER FIX: Disable auto-start due to schema mismatch
export async function POST(request: NextRequest) {
  try {
    console.log('⚠️ Auto-start tournament disabled due to schema mismatch')
    console.log('� Schema needs to be migrated on Render before auto-start works')

    return NextResponse.json({ 
      success: false, 
      message: 'Auto-start disabled - schema migration required',
      note: 'Development and production schemas are different'
    })

  } catch (error) {
    console.error('Auto-start tournament error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
