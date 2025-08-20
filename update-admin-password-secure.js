const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function updateAdminPassword() {
  try {
    console.log('🔧 Updating admin password...')
    
    // Find the admin user
    const admin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    })
    
    if (!admin) {
      console.log('❌ Admin user not found')
      return
    }
    
    // Hash the new password with a high salt rounds for security
    const newPassword = 'rootmr'
    const saltRounds = 12 // Higher than default for extra security
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)
    
    // Update admin password
    await prisma.admin.update({
      where: { id: admin.id },
      data: {
        password: hashedPassword
      }
    })
    
    console.log('✅ Admin password updated successfully!')
    console.log('👤 Username: admin')
    console.log('🔑 New Password: rootmr')
    console.log('🔒 Password is securely hashed in database')
    console.log('🛡️ Salt rounds:', saltRounds)
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminPassword()
