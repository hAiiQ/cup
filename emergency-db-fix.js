/**
 * Emergency Database Fix Script
 * This will attempt to fix database schema issues on Render
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn']
})

async function fixDatabase() {
  console.log('🔧 Emergency Database Fix')
  console.log('=========================')
  
  try {
    console.log('📊 1. Testing basic connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    
    console.log('📊 2. Checking table existence...')
    
    // Try to query users (this should work)
    try {
      const userCount = await prisma.user.count()
      console.log(`✅ Users table exists: ${userCount} users found`)
    } catch (error) {
      console.log('❌ Users table issue:', error.message)
    }
    
    // Try to query admins
    try {
      const adminCount = await prisma.admin.count()
      console.log(`✅ Admin table exists: ${adminCount} admins found`)
    } catch (error) {
      console.log('❌ Admin table issue:', error.message)
    }
    
    // Try to query teams
    try {
      const teamCount = await prisma.team.count()
      console.log(`✅ Team table exists: ${teamCount} teams found`)
    } catch (error) {
      console.log('❌ Team table issue:', error.message)
    }
    
    // Try to query TeamMember (this is likely the problem)
    try {
      const memberCount = await prisma.teamMember.count()
      console.log(`✅ TeamMember table exists: ${memberCount} memberships found`)
    } catch (error) {
      console.log('❌ TeamMember table issue:', error.message)
      
      // If TeamMember doesn't exist, try to create it
      console.log('🔄 Attempting to fix schema...')
      try {
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS "TeamMember" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL,
          "teamId" TEXT NOT NULL,
          "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
          FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE
        )`
        console.log('✅ TeamMember table created')
      } catch (createError) {
        console.log('❌ Failed to create TeamMember table:', createError.message)
      }
    }
    
    console.log('\n📋 Final check - Users with relations...')
    try {
      const usersWithTeams = await prisma.user.findMany({
        include: {
          teamMemberships: true
        },
        take: 5
      })
      console.log(`✅ Successfully loaded ${usersWithTeams.length} users with team data`)
    } catch (error) {
      console.log('❌ Still issues with relations:', error.message)
      
      // Fallback: Load users without relations
      console.log('📋 Fallback: Loading users without relations...')
      const users = await prisma.user.findMany({ take: 5 })
      console.log(`✅ Loaded ${users.length} users (without team data)`)
    }
    
    console.log('\n🎉 Database check completed')
    
  } catch (error) {
    console.error('❌ Critical database error:', error)
    
    // Check if it's a connection issue
    if (error.code === 'P1001') {
      console.log('🔧 This appears to be a connection issue')
      console.log('Check your DATABASE_URL on Render')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabase()
