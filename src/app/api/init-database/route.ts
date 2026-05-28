import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TEAM_NAMES } from '@/lib/teamDefaults'
import bcrypt from 'bcryptjs'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting database initialization...');
    
    // Create User table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "User" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "inGameName" TEXT,
        "inGameRank" TEXT,
        "valorantLevel" INTEGER,
        "valorantCurrentRank" TEXT,
        "discordName" TEXT,
        "twitchName" TEXT,
        "instagramName" TEXT,
        tier TEXT,
        "isStreamer" BOOLEAN DEFAULT false,
        "isVerified" BOOLEAN DEFAULT false,
        "rulesAccepted" BOOLEAN DEFAULT false,
        "twitchVerified" BOOLEAN DEFAULT false,
        "instagramVerified" BOOLEAN DEFAULT false,
        "discordVerified" BOOLEAN DEFAULT false,
        "teamId" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create Team table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Team" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        name TEXT UNIQUE NOT NULL,
        position INTEGER UNIQUE DEFAULT 0,
        "imageUrl" TEXT,
        "isLive" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create Admin table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Admin" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Create Match table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Match" (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        round TEXT NOT NULL,
        "bracketType" TEXT NOT NULL,
        "homeTeamId" TEXT,
        "awayTeamId" TEXT,
        "winnerId" TEXT,
        "isCompleted" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(round, "bracketType")
      );
    `;
    
    console.log('✅ All tables created!');
    
    // Create admin user
    const hashedPassword = await bcrypt.hash('rootmr', 10);
    
    await prisma.$executeRaw`
      INSERT INTO "Admin" (id, username, password) 
      VALUES (gen_random_uuid()::text, 'admin', ${hashedPassword})
      ON CONFLICT (username) DO UPDATE SET password = ${hashedPassword};
    `;
    
    console.log('✅ Admin user created');
    
    // Create teams
    for (let index = 0; index < DEFAULT_TEAM_NAMES.length; index++) {
      const teamName = DEFAULT_TEAM_NAMES[index]
      const position = index + 1
      await prisma.$executeRaw`
        INSERT INTO "Team" (id, name, position)
        VALUES (gen_random_uuid()::text, ${teamName}, ${position})
        ON CONFLICT (position) DO UPDATE SET name = ${teamName};
      `;
    }
    
    console.log('✅ Teams created');
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Database initialization complete!' 
    });
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
