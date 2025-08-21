import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Starting database schema fix...');
    
    // Execute raw SQL commands to add missing columns
    await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameNameVerified" BOOLEAN DEFAULT false`
    console.log('✅ Added inGameNameVerified column');
    
    await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameRankVerified" BOOLEAN DEFAULT false`
    console.log('✅ Added inGameRankVerified column');
    
    await prisma.$executeRaw`ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT`
    console.log('✅ Added imageUrl column to Team');
    
    await prisma.$executeRaw`ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0`
    console.log('✅ Added position column to Team');
    
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "bracket" TEXT DEFAULT 'winner'`
    console.log('✅ Added bracket column to Match');
    
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "matchNumber" INTEGER DEFAULT 1`
    console.log('✅ Added matchNumber column to Match');
    
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team1Score" INTEGER DEFAULT 0`
    console.log('✅ Added team1Score column to Match');
    
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team2Score" INTEGER DEFAULT 0`
    console.log('✅ Added team2Score column to Match');
    
    await prisma.$executeRaw`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false`
    console.log('✅ Added isLive column to Match');
    
    console.log('🎉 Database schema fix completed successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database schema fixed successfully! 🎉' 
    })
    
  } catch (error) {
    console.error('❌ Database fix error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
