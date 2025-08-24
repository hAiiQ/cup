import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    console.log('🔧 EMERGENCY: Updating admin password to rootmr');
    
    // Import bcrypt directly
    const bcrypt = require('bcryptjs');
    const newHashedPassword = await bcrypt.hash('rootmr', 12);
    
    // Update all admin users to have the new password
    const updateResult = await prisma.admin.updateMany({
      data: {
        password: newHashedPassword
      }
    });
    
    console.log(`✅ Updated ${updateResult.count} admin passwords`);
    
    // Also ensure we have an admin user
    const adminCount = await prisma.admin.count();
    
    if (adminCount === 0) {
      console.log('🔧 No admin found, creating one...');
      await prisma.admin.create({
        data: {
          username: 'admin',
          password: newHashedPassword,
          role: 'SUPER_ADMIN'
        }
      });
      console.log('✅ Admin user created');
    }
    
    return NextResponse.json({
      success: true,
      message: 'EMERGENCY: Admin password updated to rootmr',
      details: {
        updatedAdmins: updateResult.count,
        totalAdmins: adminCount === 0 ? 1 : adminCount,
        newPassword: 'rootmr'
      }
    });
    
  } catch (error) {
    console.error('❌ EMERGENCY password update failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
