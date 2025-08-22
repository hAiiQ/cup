const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testUserDeletion() {
  try {
    console.log('🔍 Testing database connection...')
    
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check if we can fetch users
    const userCount = await prisma.user.count()
    console.log(`📊 Total users in database: ${userCount}`)
    
    // Check if we can fetch admins
    const adminCount = await prisma.admin.count()
    console.log(`👤 Total admins in database: ${adminCount}`)
    
    // Check users with team memberships
    const usersWithTeams = await prisma.user.findMany({
      include: {
        teamMemberships: true
      }
    })
    
    const usersInTeams = usersWithTeams.filter(user => user.teamMemberships.length > 0)
    console.log(`🏆 Users in teams: ${usersInTeams.length}`)
    
    // List users in teams
    if (usersInTeams.length > 0) {
      console.log('\n📋 Users currently in teams:')
      usersInTeams.forEach(user => {
        console.log(`  - ${user.username} (ID: ${user.id}) - ${user.teamMemberships.length} team(s)`)
      })
    }
    
    console.log('\n✅ Database check completed successfully!')
    
  } catch (error) {
    console.error('❌ Database error:', error)
    
    if (error.code === 'P1001') {
      console.log('🔧 Connection error - check DATABASE_URL')
    } else if (error.code === 'P2002') {
      console.log('🔧 Unique constraint error')
    } else if (error.code === 'P2025') {
      console.log('🔧 Record not found error')
    }
    
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test
testUserDeletion()
