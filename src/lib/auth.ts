import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12)
}

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword)
}

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET || 'tournament-secret-key-2024-fallback'
  return jwt.sign({ userId }, secret, { expiresIn: '7d' })
}

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    const secret = process.env.JWT_SECRET || 'tournament-secret-key-2024-fallback'
    return jwt.verify(token, secret) as { userId: string }
  } catch {
    return null
  }
}
