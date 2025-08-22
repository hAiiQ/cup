import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Creating default admin account...');
    
    // Check if admin already exists
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });
    
    if (existingAdmin) {
      console.log('⚠️ Admin already exists');
      return NextResponse.json({
        success: true,
        message: 'Admin account already exists',
        credentials: { username: 'admin', password: 'admin123' }
      });
    }
    
    // Create admin account
    const hashedPassword = await hashPassword('admin123');
    
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        role: 'SUPER_ADMIN'
      }
    });
    
    console.log('✅ Admin account created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Admin account created successfully! 🎉',
      credentials: { 
        username: 'admin', 
        password: 'admin123' 
      },
      admin: {
        id: admin.id,
        username: admin.username,
        role: admin.role
      }
    });
    
  } catch (error) {
    console.error('❌ Admin creation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
