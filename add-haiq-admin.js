const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function addAdmin() {
  try {
    // Hash password (default: rootmr)
    const hashedPassword = await bcrypt.hash('rootmr', 12)
    
    // Create admin
    const admin = await prisma.admin.upsert({
      where: { username: 'hAiQ' },
      update: {},
      create: {
        username: 'hAiQ',
        password: hashedPassword,
        role: 'admin'
      }
    })

    console.log('✅ Admin erfolgreich erstellt:')
    console.log('Username: hAiQ')
        console.log('Password: rootmr')
    console.log('ID:', admin.id)
    
  } catch (error) {
    console.error('❌ Fehler beim Erstellen des Admins:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addAdmin()
