import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteAllUsers() {
  console.log('🗑️ Lösche alle User-Accounts...')
  
  try {
    // Erst alle TeamMember-Einträge löschen (wegen Foreign Key Constraints)
    const teamMembersDeleted = await prisma.teamMember.deleteMany({})
    console.log(`🔗 ${teamMembersDeleted.count} Team-Mitgliedschaften gelöscht`)
    
    // Dann alle User löschen
    const usersDeleted = await prisma.user.deleteMany({})
    console.log(`👥 ${usersDeleted.count} User-Accounts gelöscht`)
    
    // Admins bleiben erhalten - nur zur Bestätigung anzeigen
    const admins = await prisma.admin.findMany()
    console.log(`👤 ${admins.length} Admin-Accounts bleiben erhalten:`)
    admins.forEach(admin => {
      console.log(`  - ${admin.username}`)
    })
    
    // Teams zurücksetzen (Member Count auf 0)
    const teams = await prisma.team.updateMany({
      data: {
        // Teams bleiben, aber sind jetzt leer
      }
    })
    
    console.log('\n✅ Alle User erfolgreich gelöscht!')
    console.log('🏆 Tournament Teams sind jetzt leer und bereit für neue Zuweisungen')
    
  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteAllUsers()
