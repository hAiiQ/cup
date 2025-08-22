import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Emergency Database Schema Fix')
    
    // First test basic connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Check if TeamMember table exists by trying to count
    try {
      await prisma.teamMember.count()
      console.log('✅ TeamMember table already exists')
      return NextResponse.json({ 
        success: true, 
        message: 'Database schema is OK - TeamMember table exists' 
      })
    } catch (error: any) {
      if (error.message.includes('does not exist')) {
        console.log('❌ TeamMember table missing - attempting to create')
        
        // Try to create the missing table
        try {
          await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS "TeamMember" (
              "id" TEXT NOT NULL PRIMARY KEY,
              "userId" TEXT NOT NULL,
              "teamId" TEXT NOT NULL,
              "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `
          
          await prisma.$executeRaw`
            CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId")
          `
          
          await prisma.$executeRaw`
            CREATE INDEX IF NOT EXISTS "TeamMember_teamId_idx" ON "TeamMember"("teamId")
          `
          
          console.log('✅ TeamMember table created successfully')
          
          // Test if it works now
          const count = await prisma.teamMember.count()
          console.log(`✅ TeamMember table working - ${count} records`)
          
          return NextResponse.json({ 
            success: true, 
            message: 'Database schema fixed! TeamMember table created successfully.' 
          })
          
        } catch (createError: any) {
          console.error('❌ Failed to create TeamMember table:', createError)
          return NextResponse.json({ 
            success: false, 
            error: 'Failed to create TeamMember table: ' + createError.message 
          }, { status: 500 })
        }
      } else {
        throw error
      }
    }
    
  } catch (error: any) {
    console.error('❌ Database fix failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database connection failed: ' + error.message 
    }, { status: 500 })
  }
}
