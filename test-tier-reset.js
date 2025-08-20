const { PrismaClient } = require('@prisma/client');

async function testTierReset() {
  const prisma = new PrismaClient();
  
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found');
      return;
    }
    
    console.log('Test user:', user.username);
    console.log('Current tier:', user.tier || 'No tier');
    
    // Set a tier first
    const userWithTier = await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'tier1' }
    });
    
    console.log('After setting tier1:', userWithTier.tier);
    
    // Reset tier to null
    const userWithoutTier = await prisma.user.update({
      where: { id: user.id },
      data: { tier: null }
    });
    
    console.log('After resetting tier:', userWithoutTier.tier || 'No tier');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testTierReset();
