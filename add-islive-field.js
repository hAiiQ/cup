const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addIsLiveField() {
  try {
    await prisma.$executeRaw`ALTER TABLE Match ADD COLUMN isLive BOOLEAN DEFAULT false`;
    console.log('✅ isLive field added to Match table');
  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('✅ isLive field already exists');
    } else {
      console.error('Error:', error.message);
    }
  }
}

addIsLiveField().then(() => process.exit());
