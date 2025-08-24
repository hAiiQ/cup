const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function updateAdminPassword() {
  try {
    console.log('🔍 Checking current admin users...')
    
    // Check current admins
    const admins = await prisma.admin.findMany()
    console.log('Current admins:', admins.map(a => ({ id: a.id, username: a.username })))
    
    // Hash new password
    const newPassword = 'rootmr'
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    console.log('🔐 New password hashed')
    
    // Update all admin passwords to rootmr
    const result = await prisma.admin.updateMany({
      data: {
        password: hashedPassword
      }
    })
    
    console.log(`✅ Updated ${result.count} admin passwords to "rootmr"`)
    
    // Verify update
    const updatedAdmins = await prisma.admin.findMany()
    console.log('Updated admins:', updatedAdmins.map(a => ({ 
      id: a.id, 
      username: a.username,
      passwordHash: a.password.substring(0, 20) + '...'
    })))
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateAdminPassword()
