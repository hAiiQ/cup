import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Create admin account
  const hashedPassword = await bcrypt.hash('rootmr', 12)
  
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'admin'
    }
  })

  // Create 8 default teams
  for (let i = 1; i <= 8; i++) {
    await prisma.team.upsert({
      where: { position: i },
      update: {},
      create: {
        name: `Team ${i}`,
        position: i
      }
    })
  }

  console.log('✅ Admin created: username: admin, password: rootmr')
  console.log('✅ 8 Teams created (Team 1 - Team 8)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
