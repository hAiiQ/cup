import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function assignRandomTiers() {
  console.log('🎯 Weise zufällige Tiers zu...')
  
  // Hole alle User ohne Tier
  const usersWithoutTier = await prisma.user.findMany({
    where: {
      tier: null
    }
  })
  
  console.log(`👥 Gefunden: ${usersWithoutTier.length} User ohne Tier`)
  
  const tiers = ['tier1', 'tier2', 'tier3']
  let updatedUsers = 0
  
  for (const user of usersWithoutTier) {
    // Zufälliges Tier zuweisen
    const randomTier = tiers[Math.floor(Math.random() * tiers.length)]
    
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        tier: randomTier,
        isVerified: true // Auch gleich verifizieren
      }
    })
    
    updatedUsers++
    console.log(`✅ ${user.username} (${user.inGameName}): ${randomTier.toUpperCase()}`)
  }
  
  console.log(`\n🎉 ${updatedUsers} User erfolgreich mit Tiers versehen!`)
  
  // Statistiken anzeigen
  const tier1Count = await prisma.user.count({ where: { tier: 'tier1' } })
  const tier2Count = await prisma.user.count({ where: { tier: 'tier2' } })
  const tier3Count = await prisma.user.count({ where: { tier: 'tier3' } })
  const noTierCount = await prisma.user.count({ where: { tier: null } })
  
  console.log('\n📊 Tier-Verteilung:')
  console.log(`🔵 Tier 1: ${tier1Count} User`)
  console.log(`🟢 Tier 2: ${tier2Count} User`)
  console.log(`🟡 Tier 3: ${tier3Count} User`)
  console.log(`⚪ Ohne Tier: ${noTierCount} User`)
  
  await prisma.$disconnect()
}

assignRandomTiers()
