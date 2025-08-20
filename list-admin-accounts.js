const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function listAdminAccounts() {
  try {
    console.log('🔍 Checking all admin accounts in database...')
    
    const admins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        role: true
      }
    })
    
    if (admins.length > 0) {
      console.log(`\n📋 Found ${admins.length} admin account(s):`)
      console.log('─'.repeat(60))
      
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username}`)
        console.log(`   ID: ${admin.id}`)
        console.log(`   Role: ${admin.role}`)
        console.log('─'.repeat(30))
      })
      
      console.log('\n🔐 Admin Login URL: http://localhost:3000/admin')
    } else {
      console.log('❌ No admin accounts found in database!')
    }
    
  } catch (error) {
    console.error('❌ Error fetching admin accounts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

listAdminAccounts()
