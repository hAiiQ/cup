const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function testAdminLogin() {
  try {
    console.log('🔍 Checking admin login...');
    
    const admin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });
    
    if (!admin) {
      console.log('❌ Admin nicht gefunden!');
      return;
    }
    
    console.log('✅ Admin gefunden:');
    console.log('Username:', admin.username);
    console.log('Stored Password Hash:', admin.password);
    
    // Test password verification
    const testPassword = 'rootmr';
    console.log('\n🔐 Testing password:', testPassword);
    
    const isValid = await bcrypt.compare(testPassword, admin.password);
    console.log('Password valid:', isValid);
    
    if (!isValid) {
      console.log('\n❌ Password verification failed!');
      console.log('Let me try to hash the password manually...');
      
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      console.log('New hash for "rootmr":', hashedPassword);
      
      // Update the admin password
      await prisma.admin.update({
        where: { username: 'admin' },
        data: { password: hashedPassword }
      });
      
      console.log('✅ Password updated in database');
    } else {
      console.log('✅ Password verification successful!');
    }
    
  } catch (error) {
    console.error('❌ Fehler:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminLogin();
