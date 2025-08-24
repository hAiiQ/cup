import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Fixing Admin table schema...');
    
    // Add missing role column to Admin table
    await prisma.$executeRaw`ALTER TABLE "Admin" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'ADMIN'`
    console.log('✅ Added role column to Admin table');
    
    // Create default admin if doesn't exist
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });
    
    if (!existingAdmin) {
      console.log('🔧 Creating default admin account...');
      
      // We need to hash the password manually since hashPassword uses bcrypt
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('rootmr', 12);
      
      await prisma.$executeRaw`
        INSERT INTO "Admin" (id, username, password, role, "createdAt", "updatedAt") 
        VALUES (gen_random_uuid()::text, 'admin', ${hashedPassword}, 'SUPER_ADMIN', NOW(), NOW())
      `;
      
      console.log('✅ Default admin created');
    } else {
      console.log('🔧 Admin exists - FORCE UPDATING password to rootmr');
      
      // FORCE UPDATE existing admin password
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('rootmr', 12);
      
      await prisma.$executeRaw`
        UPDATE "Admin" 
        SET password = ${hashedPassword}, "updatedAt" = NOW()
        WHERE username = 'admin'
      `;
      
      console.log('✅ Admin password FORCE UPDATED to rootmr');
    }
    
    console.log('🎉 Admin schema fix completed!');
    
    return NextResponse.json({
      success: true,
      message: 'Admin schema fixed and default admin created! 🎉',
      credentials: { 
        username: 'admin', 
        password: 'rootmr' 
      }
    });
    
  } catch (error) {
    console.error('❌ Admin schema fix error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
