import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAdmins() {
  console.log('🔍 Überprüfe Admin-Accounts...')
  
  const admins = await prisma.admin.findMany()
  console.log('👤 Gefundene Admins:', admins)
  
  const users = await prisma.user.count()
  console.log('👥 Anzahl User:', users)
  
  await prisma.$disconnect()
}

checkAdmins()
