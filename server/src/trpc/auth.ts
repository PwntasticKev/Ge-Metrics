import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { eq, and, or } from 'drizzle-orm'
import { db, users, refreshTokens, subscriptions, NewUser, userSettings } from '../db/index.js'
import { publicProcedure, router, protectedProcedure } from './trpc.js'
import * as AuthModule from '../utils/auth.js'
import { GoogleAuth } from '../utils/google.js'
import crypto from 'crypto'
import { config } from '../config/index.js'
import { OtpService } from '../services/otpService.js'
import { authenticator } from 'otplib'

const authUtils = (AuthModule as any).authUtils || (AuthModule as any).default || new ((AuthModule as any).AuthUtils)()

export const authRouter = router({
  // Register new user
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
      password: z.string().min(8),
      name: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      const { email, username, password, name } = input

      // Check if user already exists (by email or username)
      const existingUser = await db.select().from(users)
        .where(
          or(
            eq(users.email, email),
            eq(users.username, username)
          )
        ).limit(1)
      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email or username already exists'
        })
      }

      // Hash password
      const { hash, salt } = await authUtils.hashPassword(password)

      // Create user
      const newUser: NewUser = {
        email,
        username,
        passwordHash: hash,
        salt,
        name
      }
      const [createdUser] = await db.insert(users).values(newUser).returning()

      // Create user settings
      await db.insert(userSettings).values({ userId: createdUser.id })

      // Create a 14-day trial subscription for the new user
      const trialEndDate = new Date()
      trialEndDate.setDate(trialEndDate.getDate() + 14)
      await db.insert(subscriptions).values({
        userId: createdUser.id,
        status: 'trialing',
        plan: 'premium', // Premium features during trial
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate
      })

      // In a real app, you would send an email here. For now, we'll log the link.
      console.log(`✅ New user registered: ${createdUser.email}`)

      return {
        success: true,
        message: 'Registration successful. Please check your email to verify your account.'
      }
    }),

  // Verify email
  verifyEmail: publicProcedure
    .input(z.object({
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const { token } = input

      // Find user by verification token
      const [user] = await db.select().from(users)
        .where(
          and(
            eq(users.emailVerificationToken, token)
            // In a real app, you'd check if the token has expired:
            // gt(users.emailVerificationTokenExpiresAt, new Date())
          )
        ).limit(1)

      if (!user) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired verification token'
        })
      }

      // Mark email as verified and clear token fields
      await db.update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null
        })
        .where(eq(users.id, user.id))

      // Generate tokens for the now-verified user
      const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

      // Store refresh token
      await db.insert(refreshTokens).values({
        userId: user.id,
        token: refreshToken,
        expiresAt: authUtils.getRefreshTokenExpiration()
      }).onConflictDoUpdate({
        target: refreshTokens.userId,
        set: {
          token: refreshToken,
          expiresAt: authUtils.getRefreshTokenExpiration()
        }
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
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
      email: z.string(), // Can be email or username
      password: z.string()
    }))
    .mutation(async ({ input }) => {
      const { email, password } = input

      // Find user by email or username
      const [user] = await db.select().from(users)
        .where(or(eq(users.email, email), eq(users.username, email)))
        .limit(1)

      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
      }

      // Verify password
      const isPasswordValid = await authUtils.verifyPassword(password, user.passwordHash)
      if (!isPasswordValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
      }

      if (!user.emailVerified) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please verify your email.' })
      }

      // Check for 2FA
      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id)
      })

      if (settings?.otpEnabled) {
        return { twoFactorRequired: true }
      }

      // If 2FA is not enabled, proceed with login
      const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

      await db.insert(refreshTokens).values({
        userId: user.id,
        token: refreshToken,
        expiresAt: authUtils.getRefreshTokenExpiration()
      }).onConflictDoUpdate({
        target: refreshTokens.userId,
        set: { token: refreshToken, expiresAt: authUtils.getRefreshTokenExpiration() }
      })

      return {
        user: { id: user.id, email: user.email, username: user.username, name: user.name, avatar: user.avatar },
        accessToken,
        refreshToken
      }
    }),

  verifyOtpAndLogin: publicProcedure
    .input(z.object({
      email: z.string(),
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const { email, token } = input

      const [user] = await db.select().from(users)
        .where(or(eq(users.email, email), eq(users.username, email)))
        .limit(1)

      if (!user) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
      }

      const settings = await db.query.userSettings.findFirst({
        where: eq(userSettings.userId, user.id)
      })

      if (!settings || !settings.otpEnabled || !settings.otpSecret) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: '2FA not enabled for this user.' })
      }

      const isValid = authenticator.check(token, settings.otpSecret)

      if (!isValid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid OTP token' })
      }

      // OTP is valid, proceed with login
      const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
      const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

      await db.insert(refreshTokens).values({
        userId: user.id,
        token: refreshToken,
        expiresAt: authUtils.getRefreshTokenExpiration()
      }).onConflictDoUpdate({
        target: refreshTokens.userId,
        set: { token: refreshToken, expiresAt: authUtils.getRefreshTokenExpiration() }
      })

      return {
        user: { id: user.id, email: user.email, username: user.username, name: user.name, avatar: user.avatar },
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
        const [tokenRecord] = await db
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.userId, parseInt(payload.userId, 10))
            )
          )
          .limit(1)

        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired refresh token'
          })
        }

        // Get user
        const [user] = await db.select().from(users).where(eq(users.id, parseInt(payload.userId, 10))).limit(1)
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found'
          })
        }

        // Generate new tokens
        const newAccessToken = authUtils.generateAccessToken(String(user.id), user.email)
        const newRefreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

        // Update the existing refresh token
        await db.update(refreshTokens)
          .set({
            token: newRefreshToken,
            expiresAt: authUtils.getRefreshTokenExpiration()
          })
          .where(eq(refreshTokens.token, refreshToken))

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
      await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))

      return { success: true }
    }),

  // Google OAuth callback
  googleCallback: publicProcedure
    .input(z.object({
      code: z.string(),
      redirectUri: z.string()
    }))
    .mutation(async ({ input }) => {
      const { code, redirectUri } = input

      try {
        // Exchange code for user info
        const googleUser = await GoogleAuth.exchangeCodeForTokens(code, redirectUri)

        if (!googleUser.verified_email) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email not verified with Google'
          })
        }

        // Check if user exists
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleUser.email))
          .limit(1)

        if (!user) {
          // Create new user
          [user] = await db.insert(users).values({
            email: googleUser.email,
            username: googleUser.email, // Use email as a temporary username
            googleId: googleUser.id,
            name: googleUser.name,
            avatar: googleUser.picture
          }).returning()
        } else if (!user.googleId) {
          // Link Google account to existing user
          [user] = await db
            .update(users)
            .set({
              googleId: googleUser.id,
              avatar: googleUser.picture || user.avatar
            })
            .where(eq(users.id, user.id))
            .returning()
        }

        // Generate tokens
        const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
        const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

        // Store refresh token
        await db.insert(refreshTokens).values({
          userId: user.id,
          token: refreshToken,
          expiresAt: authUtils.getRefreshTokenExpiration()
        }).onConflictDoUpdate({
          target: refreshTokens.userId,
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
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Google authentication failed'
        })
      }
    }),

  // Google ID token verification (alternative to code exchange)
  googleIdToken: publicProcedure
    .input(z.object({
      idToken: z.string()
    }))
    .mutation(async ({ input }) => {
      const { idToken } = input

      try {
        // Verify ID token
        const googleUser = await GoogleAuth.verifyIdToken(idToken)

        if (!googleUser.verified_email) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email not verified with Google'
          })
        }

        // Check if user exists
        let [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, googleUser.email))
          .limit(1)

        if (!user) {
          // Create new user
          [user] = await db.insert(users).values({
            email: googleUser.email,
            username: googleUser.email, // Use email as a temporary username
            googleId: googleUser.id,
            name: googleUser.name,
            avatar: googleUser.picture
          }).returning()
        } else if (!user.googleId) {
          // Link Google account to existing user
          [user] = await db
            .update(users)
            .set({
              googleId: googleUser.id,
              avatar: googleUser.picture || user.avatar
            })
            .where(eq(users.id, user.id))
            .returning()
        }

        // Generate tokens
        const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
        const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

        // Store refresh token
        await db.insert(refreshTokens).values({
          userId: user.id,
          token: refreshToken,
          expiresAt: authUtils.getRefreshTokenExpiration()
        }).onConflictDoUpdate({
          target: refreshTokens.userId,
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
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Google authentication failed'
        })
      }
    }),

  requestPasswordChangeOtp: publicProcedure
    .input(z.object({
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      const { email } = input

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      if (!user) {
        // To prevent email enumeration, we don't throw an error here.
        // We'll just log it and return a success message.
        console.warn(`Password change OTP requested for non-existent user: ${email}`)
        return {
          success: true,
          message: 'If a user with this email exists, an OTP will be sent.'
        }
      }

      const otpCode = crypto.randomBytes(3).toString('hex').toUpperCase() // 6-digit hex
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

      await db.update(users)
        .set({
          passwordResetOtp: otpCode,
          passwordResetOtpExpiresAt: otpExpiresAt
        })
        .where(eq(users.id, user.id))

      // In a real app, send the OTP via email. For now, we'll log it.
      console.log(`🔑 OTP for ${email}: ${otpCode}`)

      const response: {
        success: boolean;
        message: string;
        expiresAt: string;
        otpCode?: string;
      } = {
        success: true,
        message: 'OTP sent to your email.',
        expiresAt: otpExpiresAt.toISOString()
      }

      if (config.NODE_ENV === 'development') {
        response.otpCode = otpCode
      }

      return response
    }),

  changePasswordWithOtp: publicProcedure
    .input(z.object({
      email: z.string().email(),
      otpCode: z.string().length(6),
      newPassword: z.string().min(8)
    }))
    .mutation(async ({ input }) => {
      const { email, otpCode, newPassword } = input

      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      if (!user || !user.passwordResetOtp || !user.passwordResetOtpExpiresAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid OTP or user not found'
        })
      }

      if (user.passwordResetOtp !== otpCode) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid OTP'
        })
      }

      if (new Date() > user.passwordResetOtpExpiresAt) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'OTP has expired'
        })
      }

      const { hash, salt } = await authUtils.hashPassword(newPassword)

      await db.update(users)
        .set({
          passwordHash: hash,
          salt,
          passwordResetOtp: null,
          passwordResetOtpExpiresAt: null
        })
        .where(eq(users.id, user.id))

      // Invalidate all existing refresh tokens for this user
      await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.id))

      return {
        success: true,
        message: 'Password changed successfully'
      }
    }),

  // Get current user (protected route)
  me: protectedProcedure
    .query(async ({ ctx }) => {
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.userId)).limit(1)

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
