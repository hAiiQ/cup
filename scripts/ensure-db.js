const { execSync } = require('child_process');

async function ensureDatabase() {
  // Only run on Render (or when explicitly requested)
  if (!process.env.RENDER && process.env.RUN_DB_SETUP !== '1') {
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set — cannot create tables');
    process.exit(1);
  }

  console.log('🗄️ [Render] Applying Prisma schema to database...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('🌱 [Render] Seeding admin and default teams...');
  const setupProduction = require('./setup-production');
  await setupProduction();
  console.log('✅ [Render] Database ready');
}

ensureDatabase().catch((error) => {
  console.error('❌ Database setup failed:', error);
  process.exit(1);
});
