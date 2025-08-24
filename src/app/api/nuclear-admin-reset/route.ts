import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔥 NUCLEAR OPTION: Delete and recreate admin with strong password');

    // Step 1: Delete ALL existing admins
    const deleteResult = await prisma.admin.deleteMany({});
    console.log(`🗑️ Deleted ${deleteResult.count} existing admin accounts`);

    // Step 2: Create new admin with strong password
    const bcrypt = require('bcryptjs');
    const strongPassword = 'Admin2024!SecurePass#rootmr';
    const hashedPassword = await bcrypt.hash(strongPassword, 12);
    
    const newAdmin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Created new admin with strong password');

    return NextResponse.json({
      success: true,
      message: 'NUCLEAR RESET: All old admins deleted, new secure admin created',
      credentials: { 
        username: 'admin', 
        password: strongPassword 
      },
      action: 'nuclear_reset',
      deletedCount: deleteResult.count,
      newAdmin: {
        id: newAdmin.id,
        username: newAdmin.username,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('❌ Nuclear reset error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to nuclear reset: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}
