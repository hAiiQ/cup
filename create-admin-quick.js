const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    console.log('🔧 Creating admin account...')
    
    // Hash password
    const hashedPassword = await bcrypt.hash('rootmr', 10)
    
    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'admin'
      }
    })
    
    console.log('✅ Admin account created successfully!')
    console.log('👤 Username: admin')
    console.log('🔑 Password: rootmr')
    console.log('🆔 Admin ID:', admin.id)
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️ Admin account already exists')
    } else {
      console.error('❌ Error creating admin:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
