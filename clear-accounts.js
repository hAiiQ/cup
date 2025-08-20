const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllAccounts() {
  try {
    console.log('🗑️ Lösche alle Accounts...')
    
    // Lösche alle TeamMembers zuerst (wegen Foreign Key Constraints)
    const deletedMembers = await prisma.teamMember.deleteMany({})
    console.log(`✅ ${deletedMembers.count} Team-Mitglieder gelöscht`)
    
    // Lösche alle User
    const deletedUsers = await prisma.user.deleteMany({})
    console.log(`✅ ${deletedUsers.count} User gelöscht`)
    
    // Lösche alle Admins
    const deletedAdmins = await prisma.admin.deleteMany({})
    console.log(`✅ ${deletedAdmins.count} Admins gelöscht`)
    
    console.log('🎉 Alle Accounts erfolgreich gelöscht!')
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen der Accounts:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllAccounts()
