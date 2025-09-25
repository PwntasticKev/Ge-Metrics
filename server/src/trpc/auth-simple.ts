import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { router, publicProcedure, protectedProcedure } from './trpc.js'
import { memoryDb } from '../db/memory.js'
import { AuthUtils } from '../utils/auth.js'
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
      const existingUser = await memoryDb.users.findByEmail(email)
      if (existingUser) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists'
        })
      }

      // Hash password
      const { hash, salt } = await AuthUtils.hashPassword(password)

      // Create user
      const newUser = await memoryDb.users.create({
        email,
        passwordHash: hash,
        salt,
        name
      })

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(String(newUser.id), newUser.email)
      const refreshToken = AuthUtils.generateRefreshToken(String(newUser.id), newUser.email)

      // Store refresh token
      await memoryDb.refreshTokens.create({
        userId: newUser.id,
        token: refreshToken,
        expiresAt: AuthUtils.getRefreshTokenExpiration()
      })

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatar: newUser.avatar
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
      const user = await memoryDb.users.findByEmail(email)
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      // Verify password
      const isValidPassword = await AuthUtils.verifyPassword(password, user.passwordHash)
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials'
        })
      }

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = AuthUtils.generateRefreshToken(String(user.id), user.email)

      // Store refresh token
      await memoryDb.refreshTokens.create({
        userId: user.id,
        token: refreshToken,
        expiresAt: AuthUtils.getRefreshTokenExpiration()
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
        const payload = AuthUtils.verifyRefreshToken(refreshToken)

        // Check if refresh token exists in database
        const tokenRecord = await memoryDb.refreshTokens.findByToken(refreshToken)
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired refresh token'
          })
        }

        // Get user
        const user = await memoryDb.users.findById(String(payload.userId))
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found'
          })
        }

        // Generate new tokens
        const newAccessToken = AuthUtils.generateAccessToken(String(user.id), user.email)
        const newRefreshToken = AuthUtils.generateRefreshToken(String(user.id), user.email)

        // Delete old refresh token and create new one
        await memoryDb.refreshTokens.deleteByToken(refreshToken)
        await memoryDb.refreshTokens.create({
          userId: user.id,
          token: newRefreshToken,
          expiresAt: AuthUtils.getRefreshTokenExpiration()
        })

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
      await memoryDb.refreshTokens.deleteByToken(refreshToken)

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
      const user = await memoryDb.users.findByEmail(email)
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      // Invalidate any existing password reset OTPs
      await OtpService.invalidateOtps(parseInt(user.id, 10), 'password_reset')

      // Generate new OTP
      const { otpCode, expiresAt } = await OtpService.generateOtp(
        parseInt(user.id, 10),
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
      const user = await memoryDb.users.findByEmail(email)
      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      // Verify OTP
      const otpResult = await OtpService.verifyOtp(parseInt(user.id, 10), otpCode, 'password_reset')
      if (!otpResult.valid) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: otpResult.message
        })
      }

      // Hash new password
      const { hash, salt } = await AuthUtils.hashPassword(newPassword)

      // Update user password
      await memoryDb.users.update(user.id, {
        passwordHash: hash,
        salt
      })

      // Invalidate all refresh tokens for this user
      await memoryDb.refreshTokens.deleteByUserId(parseInt(user.id, 10))

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
      const user = await memoryDb.users.findById(String(ctx.user.userId))
      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      // Verify current password
      const isValidPassword = await AuthUtils.verifyPassword(currentPassword, user.passwordHash)
      if (!isValidPassword) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current password is incorrect'
        })
      }

      // Hash new password
      const { hash, salt } = await AuthUtils.hashPassword(newPassword)

      // Update user password
      await memoryDb.users.update(user.id, {
        passwordHash: hash,
        salt
      })

      // Invalidate all refresh tokens for this user
      await memoryDb.refreshTokens.deleteByUserId(parseInt(user.id, 10))

      return {
        success: true,
        message: 'Password changed successfully'
      }
    }),

  // Get current user (protected route)
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await memoryDb.users.findById(String(ctx.user.userId))

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found'
        })
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt
      }
    })
})
