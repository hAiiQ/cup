import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function forceAdminReset() {
  console.log('🔄 Forcing complete admin session reset...')
  
  // Optional: Update all admin tokens in database to force re-login
  // For now, just show current admin status
  
  const admins = await prisma.admin.findMany()
  console.log('🔍 Current Admin IDs in database:')
  admins.forEach(admin => {
    console.log(`  - ${admin.username}: ${admin.id}`)
  })
  
  console.log('\n📋 To fix admin authentication:')
  console.log('1. Clear browser cache/cookies completely')
  console.log('2. Go to http://localhost:3000/admin')
    console.log('3. Login with: admin / rootmr')
  console.log('4. New token will be created with correct admin ID')
  
  await prisma.$disconnect()
}

forceAdminReset()
