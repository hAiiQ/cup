import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Updating admin password to rootmr...');
    
    // Update existing admin password
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('rootmr', 12);
    
    const result = await prisma.admin.updateMany({
      data: {
        password: hashedPassword
      }
    });
    
    console.log(`✅ Updated ${result.count} admin passwords to "rootmr"`);
    
    return NextResponse.json({
      success: true,
      message: `Admin password updated successfully! Updated ${result.count} admin(s)`,
      credentials: { 
        username: 'admin', 
        password: 'rootmr' 
      },
      updatedCount: result.count
    });
    
  } catch (error) {
    console.error('❌ Admin password update error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update admin password: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
}
