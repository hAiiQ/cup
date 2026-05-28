import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTeams() {
  const teamNames = Array.from({ length: 16 }, (_, index) => `Team ${index + 1}`)

  for (let i = 0; i < teamNames.length; i++) {
    await prisma.team.upsert({
      where: { position: i + 1 },
      update: { name: teamNames[i] },
      create: {
        name: teamNames[i],
        position: i + 1
      }
    })
  }
  
  console.log('Teams created successfully!')
  const teams = await prisma.team.findMany({ orderBy: { position: 'asc' } })
  console.log('Created teams:', teams.map(t => `${t.name} (Position ${t.position})`))
  
  await prisma.$disconnect()
}

createTeams().catch(console.error)
