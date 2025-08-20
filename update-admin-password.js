const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Simple hash function for development (same as in auth.ts)
async function hashPassword(password) {
  const crypto = require('crypto')
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex')
  return `${salt}:${hash}`
}

async function updateAdminPassword() {
  try {
    console.log('🔄 Updating admin password...')
    
    const newPassword = 'rootmr'
    const hashedPassword = await hashPassword(newPassword)
    
    // Update the admin password
    const result = await prisma.admin.updateMany({
      where: {
        username: 'admin'
      },
      data: {
        password: hashedPassword
      }
    })
    
    if (result.count > 0) {
      console.log('✅ Admin password updated successfully!')
      console.log('📋 New login credentials:')
      console.log('   Username: admin')
      console.log('   Password: rootmr')
    } else {
      console.log('❌ No admin user found with username "admin"')
      
      // List all admins
      const admins = await prisma.admin.findMany()
      console.log('📋 Available admin users:')
      admins.forEach(admin => {
        console.log(`   - ${admin.username}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminPassword()
