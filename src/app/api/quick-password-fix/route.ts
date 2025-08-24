import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔥 QUICK FIX: Change admin password NOW');
    
    // Direct password update with bcrypt
    const bcrypt = require('bcryptjs');
    const newPassword = 'rootmr';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update admin password using raw SQL to bypass any caching
    await prisma.$executeRaw`
      UPDATE "Admin" 
      SET password = ${hashedPassword}
      WHERE username = 'admin'
    `;
    
    console.log('✅ Admin password updated via raw SQL');
    
    // Verify the update
    const admin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });
    
    return NextResponse.json({
      success: true,
      message: 'QUICK FIX: Admin password updated to rootmr via raw SQL',
      credentials: { username: 'admin', password: 'rootmr' },
      verification: admin ? 'Admin found in database' : 'Admin not found'
    });
    
  } catch (error) {
    console.error('❌ Quick fix error:', error);
    return NextResponse.json({
      success: false,
      error: 'Quick fix failed: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}
