import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 FORCE UPDATE: Always set admin password to rootmr');

    // ALWAYS update admin password, regardless if it exists
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('rootmr', 12);
    
    // First try to update existing admin
    const updateResult = await prisma.admin.updateMany({
      where: { username: 'admin' },
      data: { password: hashedPassword }
    });
    
    if (updateResult.count > 0) {
      console.log(`✅ FORCE UPDATED ${updateResult.count} admin passwords to rootmr`);
      
      return NextResponse.json({
        success: true,
        message: 'FORCE UPDATE: Admin password changed to rootmr',
        credentials: { username: 'admin', password: 'rootmr' },
        action: 'updated_existing',
        updatedCount: updateResult.count
      });
    }
    
    // If no admin exists, create one
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });

    console.log('✅ Created new admin with rootmr password');

    return NextResponse.json({
      success: true,
      message: 'New admin created with rootmr password',
      credentials: { 
        username: 'admin', 
        password: 'rootmr' 
      },
      action: 'created_new',
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('❌ Force update error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to force update: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}
