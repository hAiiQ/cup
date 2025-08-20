const { PrismaClient } = require('@prisma/client');

async function testVerificationTexts() {
  const prisma = new PrismaClient();
  
  try {
    // Get a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found');
      return;
    }
    
    console.log('Test user:', user.username);
    
    // Update user with social media accounts and verify them
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        discordName: 'TestUser#1234',
        twitchName: 'TestUser',
        instagramName: 'test_user',
        discordVerified: true,
        twitchVerified: true,
        instagramVerified: true
      }
    });
    
    console.log('Updated user social media:');
    console.log('Discord:', updatedUser.discordName, '- Verified:', updatedUser.discordVerified);
    console.log('Twitch:', updatedUser.twitchName, '- Verified:', updatedUser.twitchVerified);
    console.log('Instagram:', updatedUser.instagramName, '- Verified:', updatedUser.instagramVerified);
    
    console.log('\nExpected dashboard display:');
    console.log(`Discord: "${updatedUser.discordName} ist in JoeDom's Discord Gruppe"`);
    console.log(`Twitch: "${updatedUser.twitchName} folgt JoeDom auf Twitch"`);
    console.log(`Instagram: "${updatedUser.instagramName} folgt OXS auf Instagram"`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testVerificationTexts();
