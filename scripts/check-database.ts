import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('🔍 Überprüfe Datenbank-Status...')
  
  const userCount = await prisma.user.count()
  const adminCount = await prisma.admin.count()
  const teamCount = await prisma.team.count()
  const teamMemberCount = await prisma.teamMember.count()
  
  console.log('\n📊 Aktuelle Datenbank-Statistiken:')
  console.log(`👥 User: ${userCount}`)
  console.log(`👤 Admins: ${adminCount}`)
  console.log(`🏆 Teams: ${teamCount}`)
  console.log(`🔗 Team-Mitglieder: ${teamMemberCount}`)
  
  if (userCount > 0) {
    console.log('\n👥 Erste 5 User:')
    const users = await prisma.user.findMany({ take: 5 })
    users.forEach(user => {
      console.log(`  - ${user.username} (${user.inGameName || 'No name'})`)
    })
  }
  
  await prisma.$disconnect()
}

checkDatabase()
