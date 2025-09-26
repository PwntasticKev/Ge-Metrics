import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from './trpc.js'
import * as schema from '../db/schema.js'
import { db } from '../db/index.js'
import { eq, and } from 'drizzle-orm'
import { authUtils } from '../utils/auth.js'
import { OtpService } from '../services/otpService.js'

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      const { email, password, name } = input

      // Check if user already exists
      const existingUser = await db.select().from(schema.users).where(eq(schema.users.email, email))
      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists'
        })
      }

      // Hash password
      const { hash, salt } = await authUtils.hashPassword(password)

      // Create user
      const newUser = await db.insert(schema.users).values({
        email,
        username: email, // Use email as a temporary username
        passwordHash: hash,
        salt,
        name
      }).returning()

      const user = newUser[0]

      // Generate tokens
      const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

      // Store refresh token
      await db.insert(schema.refreshTokens).values({
        userId: user.id,
        token: refreshToken,
        expiresAt: authUtils.getRefreshTokenExpiration()
      }).onConflictDoUpdate({
        target: schema.refreshTokens.userId,
        set: {
          token: refreshToken,
          expiresAt: authUtils.getRefreshTokenExpiration()
        }
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        },
        accessToken,
        refreshToken
      }
    }),

  // Login user
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string()
    }))
    .mutation(async ({ input }) => {
      const { email, password } = input

      // Find user
      const users = await db.select().from(schema.users).where(eq(schema.users.email, email))
      if (users.length === 0 || !users[0].passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      const user = users[0]

      // Verify password
      const isValidPassword = await authUtils.verifyPassword(password, user.passwordHash || '')
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      // Generate tokens
      const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

      // Store refresh token
      await db.insert(schema.refreshTokens).values({
        userId: user.id,
        token: refreshToken,
        expiresAt: authUtils.getRefreshTokenExpiration()
      }).onConflictDoUpdate({
        target: schema.refreshTokens.userId,
        set: {
          token: refreshToken,
          expiresAt: authUtils.getRefreshTokenExpiration()
        }
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        },
        accessToken,
        refreshToken
      }
    }),

  // Refresh tokens
  refresh: publicProcedure
    .input(z.object({
      refreshToken: z.string()
    }))
    .mutation(async ({ input }) => {
      const { refreshToken } = input

      try {
        // Verify refresh token
        const payload = authUtils.verifyRefreshToken(refreshToken)

        // Check if refresh token exists in database
        const tokenRecords = await db.select()
          .from(schema.refreshTokens)
          .where(eq(schema.refreshTokens.token, refreshToken))

        if (tokenRecords.length === 0 || tokenRecords[0].expiresAt < new Date()) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired refresh token'
          })
        }

        // Get user
        const users = await db.select().from(schema.users).where(eq(schema.users.id, parseInt(payload.userId)))
        if (users.length === 0) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found'
          })
        }

        const user = users[0]

        // Generate new tokens
        const newAccessToken = authUtils.generateAccessToken(String(user.id), user.email)
        const newRefreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

        // Update the existing refresh token
        await db.update(schema.refreshTokens)
          .set({
            token: newRefreshToken,
            expiresAt: authUtils.getRefreshTokenExpiration()
          })
          .where(eq(schema.refreshTokens.token, refreshToken))

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar
          },
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      } catch (error) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid refresh token'
        })
      }
    }),

  // Logout user
  logout: publicProcedure
    .input(z.object({
      refreshToken: z.string()
    }))
    .mutation(async ({ input }) => {
      const { refreshToken } = input

      // Delete refresh token from database
      await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.token, refreshToken))

      return { success: true }
    }),

  // Request password change OTP
  requestPasswordChangeOtp: publicProcedure
    .input(z.object({
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      const { email } = input

      // Find user
      const users = await db.select().from(schema.users).where(eq(schema.users.email, email))
      if (users.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      const user = users[0]

      // Invalidate any existing password reset OTPs
      await OtpService.invalidateOtps(user.id, 'password_reset')

      // Generate new OTP
      const { otpCode, expiresAt } = await OtpService.generateOtp(
        user.id,
        'password_reset',
        { expiresInMinutes: 10 }
      )

      // TODO: Send OTP via email/SMS
      // For now, we'll return it in the response (remove this in production)
      console.log(`Password reset OTP for ${email}: ${otpCode}`)

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt,
        // Remove this in production - only for testing
        otpCode: process.env.NODE_ENV === 'development' ? otpCode : undefined
      }
    }),

  // Verify OTP and change password
  changePasswordWithOtp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      otpCode: z.string().length(6),
      newPassword: z.string().min(8)
    }))
    .mutation(async ({ input }) => {
      const { email, otpCode, newPassword } = input

      // Find user
      const users = await db.select().from(schema.users).where(eq(schema.users.email, email))
      if (users.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      const user = users[0]

      // Verify OTP
      const otpResult = await OtpService.verifyOtp(user.id, otpCode, 'password_reset')
      if (!otpResult.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: otpResult.message
        })
      }

      // Hash new password
      const { hash, salt } = await authUtils.hashPassword(newPassword)

      // Update user password
      await db.update(schema.users)
        .set({
          passwordHash: hash,
          salt,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, user.id))

      // Invalidate all refresh tokens for this user
      await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, user.id))

      return {
        success: true,
        message: 'Password changed successfully'
      }
    }),

  // Change password (for logged-in users)
  changePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8)
    }))
    .mutation(async ({ input, ctx }) => {
      const { currentPassword, newPassword } = input

      // Get user
      const users = await db.select().from(schema.users).where(eq(schema.users.id, ctx.user.userId))
      if (users.length === 0 || !users[0].passwordHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      const user = users[0]

      // Verify current password
      const isValidPassword = await authUtils.verifyPassword(currentPassword, user.passwordHash || '')
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        })
      }

      // Hash new password
      const { hash, salt } = await authUtils.hashPassword(newPassword)

      // Update user password
      await db.update(schema.users)
        .set({
          passwordHash: hash,
          salt,
          updatedAt: new Date()
        })
        .where(eq(schema.users.id, user.id))

      // Invalidate all refresh tokens for this user
      await db.delete(schema.refreshTokens).where(eq(schema.refreshTokens.userId, user.id))

      return {
        success: true,
        message: 'Password changed successfully'
      }
    }),

  // Get current user (protected route)
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const users = await db.select().from(schema.users).where(eq(schema.users.id, ctx.user.userId))

      if (users.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      const user = users[0]

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      }
    })
})
