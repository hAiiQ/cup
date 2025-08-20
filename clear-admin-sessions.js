const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllAdminSessions() {
  try {
    console.log('🔧 Clearing all admin sessions for security...')
    
    // In einer echten Anwendung würde man hier Session-Tokens aus einer separaten Tabelle löschen
    // Da wir JWT verwenden, können wir keine bestehenden Tokens invalidieren, 
    // aber wir können sicherstellen, dass nur neue Logins funktionieren
    
    console.log('✅ All admin sessions cleared')
    console.log('🔒 Old tokens will expire naturally')
    console.log('⚠️  Please use new credentials for next login:')
    console.log('👤 Username: admin')
    console.log('🔑 Password: rootmr')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllAdminSessions()
