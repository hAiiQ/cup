import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    console.log('🚨 EMERGENCY COMPLETE DATABASE RESET')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connected')
    
    // Run a complete schema push (this will recreate all missing tables)
    console.log('🔄 Pushing complete schema...')
    
    try {
      // This is equivalent to running "npx prisma db push --accept-data-loss"
      await prisma.$executeRaw`PRAGMA foreign_keys = OFF;`
      
      // Drop existing tables if they exist (in correct order)
      await prisma.$executeRaw`DROP TABLE IF EXISTS "TeamMember";`
      await prisma.$executeRaw`DROP TABLE IF EXISTS "User";`
      await prisma.$executeRaw`DROP TABLE IF EXISTS "Admin";`
      await prisma.$executeRaw`DROP TABLE IF EXISTS "Team";`
      
      console.log('🗑️ Dropped existing tables')
      
      // Create Admin table
      await prisma.$executeRaw`
        CREATE TABLE "Admin" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // Create User table
      await prisma.$executeRaw`
        CREATE TABLE "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "inGameName" TEXT,
          "rank" TEXT,
          "twitchName" TEXT,
          "instagramName" TEXT,
          "discordName" TEXT,
          "isVerified" BOOLEAN NOT NULL DEFAULT false,
          "rulesAccepted" BOOLEAN NOT NULL DEFAULT false,
          "tier" TEXT,
          "isStreamer" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // Create Team table
      await prisma.$executeRaw`
        CREATE TABLE "Team" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "memberCount" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `
      
      // Create TeamMember table
      await prisma.$executeRaw`
        CREATE TABLE "TeamMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "teamId" TEXT NOT NULL,
          "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `
      
      // Create indexes
      await prisma.$executeRaw`CREATE INDEX "TeamMember_userId_idx" ON "TeamMember"("userId");`
      await prisma.$executeRaw`CREATE INDEX "TeamMember_teamId_idx" ON "TeamMember"("teamId");`
      
      await prisma.$executeRaw`PRAGMA foreign_keys = ON;`
      
      console.log('✅ Schema recreated successfully')
      
      // Create default admin
      try {
        const hashedPassword = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyNc4p2X4/q9S2' // 'admin123'
        await prisma.admin.create({
          data: {
            id: 'admin_1',
            username: 'admin',
            password: hashedPassword
          }
        })
        console.log('✅ Default admin created')
      } catch (adminError) {
        console.log('ℹ️ Admin might already exist')
      }
      
      // Create default teams
      const teamNames = ['Team Alpha', 'Team Beta', 'Team Gamma', 'Team Delta', 'Team Epsilon', 'Team Zeta', 'Team Eta', 'Team Theta']
      
      for (let i = 0; i < teamNames.length; i++) {
        try {
          await prisma.team.create({
            data: {
              id: `team_${i + 1}`,
              name: teamNames[i]
            }
          })
        } catch (teamError) {
          console.log(`ℹ️ Team ${teamNames[i]} might already exist`)
        }
      }
      
      console.log('✅ Default teams created')
      
      // Test everything works
      const userCount = await prisma.user.count()
      const teamCount = await prisma.team.count()
      const adminCount = await prisma.admin.count()
      const memberCount = await prisma.teamMember.count()
      
      console.log(`📊 Final counts: ${userCount} users, ${teamCount} teams, ${adminCount} admins, ${memberCount} memberships`)
      
      return NextResponse.json({ 
        success: true, 
        message: 'COMPLETE DATABASE RESET SUCCESSFUL! All tables recreated.',
        counts: {
          users: userCount,
          teams: teamCount,
          admins: adminCount,
          memberships: memberCount
        }
      })
      
    } catch (schemaError: any) {
      console.error('❌ Schema creation failed:', schemaError)
      return NextResponse.json({ 
        success: false, 
        error: 'Schema creation failed: ' + schemaError.message 
      }, { status: 500 })
    }
    
  } catch (error: any) {
    console.error('❌ Complete reset failed:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Database reset failed: ' + error.message 
    }, { status: 500 })
  }
}
