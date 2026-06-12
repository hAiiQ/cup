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

  const defaultTeams = Array.from({ length: 32 }, (_, index) => `Team ${index + 1}`)

  for (let i = 0; i < defaultTeams.length; i++) {
    await prisma.team.upsert({
      where: { position: i + 1 },
      update: { name: defaultTeams[i] },
      create: {
        name: defaultTeams[i],
        position: i + 1
      }
    })
  }

  console.log('✅ Admin created: username: admin, password: rootmr')
  console.log(`✅ ${defaultTeams.length} Teams created (${defaultTeams[0]} - ${defaultTeams[defaultTeams.length - 1]})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
