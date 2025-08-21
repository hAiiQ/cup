// Quick database schema fix for PostgreSQL
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://tournament_user:DjVeAMQ5ph3ikXlcje97jdtBKadvXhZC@dpg-d2j891n5r7bs73ei64c0-a/tournament_db_tvwf';

async function fixDatabase() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Add missing columns to User table
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameNameVerified" BOOLEAN DEFAULT false;`);
    console.log('✅ Added inGameNameVerified');
    
    await client.query(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "inGameRankVerified" BOOLEAN DEFAULT false;`);
    console.log('✅ Added inGameRankVerified');

    // Add missing columns to Team table  
    await client.query(`ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;`);
    console.log('✅ Added imageUrl to Team');
    
    await client.query(`ALTER TABLE "Team" ADD COLUMN IF NOT EXISTS "position" INTEGER DEFAULT 0;`);
    console.log('✅ Added position to Team');

    // Add missing columns to Match table
    await client.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "bracket" TEXT DEFAULT 'winner';`);
    console.log('✅ Added bracket to Match');
    
    await client.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "matchNumber" INTEGER DEFAULT 1;`);
    console.log('✅ Added matchNumber to Match');
    
    await client.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team1Score" INTEGER DEFAULT 0;`);
    console.log('✅ Added team1Score to Match');
    
    await client.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "team2Score" INTEGER DEFAULT 0;`);
    console.log('✅ Added team2Score to Match');
    
    await client.query(`ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "isLive" BOOLEAN DEFAULT false;`);
    console.log('✅ Added isLive to Match');

    console.log('🎉 Database schema fixed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixDatabase();
