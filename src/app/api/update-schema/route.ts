import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating database schema...');
    
    // Add missing columns with error handling
    const updates = [
      { query: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameNameVerified" BOOLEAN DEFAULT false;`, name: 'User.inGameNameVerified' },
      { query: `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameRankVerified" BOOLEAN DEFAULT false;`, name: 'User.inGameRankVerified' },
      { query: `ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`, name: 'Team.imageUrl' },
      { query: `ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0;`, name: 'Team.position' },
      { query: `ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "bracket" TEXT DEFAULT 'winner';`, name: 'Match.bracket' },
      { query: `ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "matchNumber" INTEGER DEFAULT 1;`, name: 'Match.matchNumber' },
      { query: `ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team1Score" INTEGER DEFAULT 0;`, name: 'Match.team1Score' },
      { query: `ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team2Score" INTEGER DEFAULT 0;`, name: 'Match.team2Score' },
      { query: `ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false;`, name: 'Match.isLive' },
    ];
    
    for (const update of updates) {
      try {
        await prisma.$executeRawUnsafe(update.query);
        console.log(`✅ Added ${update.name}`);
      } catch (error) {
        console.log(`⚠️ ${update.name} - probably already exists`);
      }
    }
    
    // Create TeamMember table
    try {
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "TeamMember" (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "userId" TEXT NOT NULL,
          "teamId" TEXT NOT NULL,
          role TEXT DEFAULT 'member',
          UNIQUE("userId", "teamId")
        );
      `;
      console.log('✅ Created TeamMember table');
    } catch (error) {
      console.log('⚠️ TeamMember table already exists');
    }
    
    console.log('🎉 Database schema update complete!');
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Database schema updated successfully!' 
    });
    
  } catch (error) {
    console.error('❌ Schema update failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
