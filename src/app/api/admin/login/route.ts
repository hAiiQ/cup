import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function envAdminCredentialsMatch(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME || 'admin'
  const expectedPass = process.env.ADMIN_PASSWORD || 'rootmr'
  return username === expectedUser && password === expectedPass
}

function adminLoginResponse(username: string, adminId: string, role: string) {
  const token = generateToken(`admin_${adminId}`)
  const response = NextResponse.json({
    message: 'Admin-Anmeldung erfolgreich',
    admin: { id: adminId, username, role },
  })
  response.cookies.set('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  })
  return response
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Benutzername und Passwort sind erforderlich' },
        { status: 400 }
      )
    }

    let admin = null
    try {
      admin = await prisma.admin.findUnique({ where: { username } })
    } catch (error) {
      const missingTable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021'

      if (missingTable && envAdminCredentialsMatch(username, password)) {
        console.log('✅ Admin login via env fallback (tables not migrated yet)')
        return adminLoginResponse(username, 'env_admin', 'SUPER_ADMIN')
      }

      if (missingTable) {
        return NextResponse.json(
          {
            error:
              'Datenbank-Tabellen fehlen. Starte den Service auf Render neu (Deploy) — das Schema wird beim Start automatisch angelegt.',
          },
          { status: 503 }
        )
      }

      throw error
    }

    if (!admin) {
      if (envAdminCredentialsMatch(username, password)) {
        return adminLoginResponse(username, 'env_admin', 'SUPER_ADMIN')
      }
      return NextResponse.json({ error: 'Ungültige Admin-Anmeldedaten' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, admin.password)
    if (!isValid) {
      if (envAdminCredentialsMatch(username, password)) {
        return adminLoginResponse(username, admin.id, admin.role)
      }
      return NextResponse.json({ error: 'Ungültige Admin-Anmeldedaten' }, { status: 401 })
    }

    return adminLoginResponse(username, admin.id, admin.role)
  } catch (error) {
    console.error('❌ Admin login error:', error)
    return NextResponse.json(
      { error: 'Interner Serverfehler' },
      { status: 500 }
    )
  }
}
