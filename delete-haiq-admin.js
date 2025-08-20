const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteHaiqAdmin() {
  try {
    console.log('🔄 Deleting hAiQ admin account...')
    
    // Delete the hAiQ admin account
    const result = await prisma.admin.delete({
      where: {
        username: 'hAiQ'
      }
    })
    
    console.log('✅ hAiQ admin account deleted successfully!')
    console.log(`   Deleted account: ${result.username} (ID: ${result.id})`)
    
    // List remaining admin accounts
    const remainingAdmins = await prisma.admin.findMany({
      select: {
        id: true,
        username: true,
        role: true
      }
    })
    
    console.log(`\n📋 Remaining admin accounts: ${remainingAdmins.length}`)
    remainingAdmins.forEach((admin, index) => {
      console.log(`${index + 1}. Username: ${admin.username}`)
      console.log(`   ID: ${admin.id}`)
      console.log(`   Role: ${admin.role}`)
    })
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.log('❌ hAiQ admin account not found!')
    } else {
      console.error('❌ Error deleting admin account:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

deleteHaiqAdmin()
