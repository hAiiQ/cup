const { PrismaClient } = require('@prisma/client');

async function checkUserNames() {
  const prisma = new PrismaClient();
  
  try {
    const user = await prisma.user.findFirst();
    if (!user) {
      console.log('No users found');
      return;
    }
    
    console.log('Current user social media names:');
    console.log('Discord:', user.discordName);
    console.log('Twitch:', user.twitchName);
    console.log('Instagram:', user.instagramName);
    console.log('Verified status:');
    console.log('Discord verified:', user.discordVerified);
    console.log('Twitch verified:', user.twitchVerified);
    console.log('Instagram verified:', user.instagramVerified);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserNames();
