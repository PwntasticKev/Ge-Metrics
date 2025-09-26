import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { config } from '../config/index.js'
import { db, users, refreshTokens } from '../db/index.js'

const REFRESH_TOKEN_EXPIRATION = '7d'

export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

class AuthUtils {
  async hashPassword (password: string): Promise<{ hash: string, salt: string }> {
    const salt = await bcrypt.genSalt(10)
    const hash = await bcrypt.hash(password, salt)
    return { hash, salt }
  }

  async verifyPassword (password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  // JWT token generation
  generateAccessToken (userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'access'
    }

    const options: jwt.SignOptions = {
      expiresIn: (config.JWT_ACCESS_EXPIRES_IN) as unknown as jwt.SignOptions['expiresIn'],
      issuer: 'auth-server',
      audience: 'client-app'
    }
    return jwt.sign(payload, String(config.JWT_ACCESS_SECRET), options)
  }

  generateRefreshToken (userId: string, email: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      type: 'refresh'
    }

    const refreshOptions: jwt.SignOptions = {
      expiresIn: (config.JWT_REFRESH_EXPIRES_IN) as unknown as jwt.SignOptions['expiresIn'],
      issuer: 'auth-server',
      audience: 'client-app'
    }
    return jwt.sign(payload, String(config.JWT_REFRESH_SECRET), refreshOptions)
  }

  // JWT token verification
  verifyAccessToken (token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_ACCESS_SECRET, {
        issuer: 'auth-server',
        audience: 'client-app'
      }) as JWTPayload

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      throw new Error('Invalid access token')
    }
  }

  verifyRefreshToken (token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, config.JWT_REFRESH_SECRET, {
        issuer: 'auth-server',
        audience: 'client-app'
      }) as JWTPayload

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      return decoded
    } catch (error) {
      throw new Error('Invalid refresh token')
    }
  }

  // Token expiration helpers
  getAccessTokenExpiration (): Date {
    const expiresIn = config.JWT_ACCESS_EXPIRES_IN
    const now = new Date()

    // Parse expiration string (e.g., "7d", "24h", "30m")
    const match = expiresIn.match(/^(\d+)([dhm])$/)
    if (!match) {
      throw new Error('Invalid expiration format')
    }

    const [, amount, unit] = match
    const amountNum = parseInt(amount, 10)

    switch (unit) {
      case 'd':
        return new Date(now.getTime() + amountNum * 24 * 60 * 60 * 1000)
      case 'h':
        return new Date(now.getTime() + amountNum * 60 * 60 * 1000)
      case 'm':
        return new Date(now.getTime() + amountNum * 60 * 1000)
      default:
        throw new Error('Invalid expiration unit')
    }
  }

  getRefreshTokenExpiration (): Date {
    return this.getAccessTokenExpiration()
  }

  // Generate unique tokens
  generateUniqueToken (): string {
    return randomUUID()
  }
}

export { AuthUtils }
export default new AuthUtils()
