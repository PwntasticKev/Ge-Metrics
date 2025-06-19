import { z } from 'zod'
import { TRPCError } from '@trpc/server'
import { eq, and } from 'drizzle-orm'
import { router, publicProcedure, protectedProcedure } from './trpc.js'
import { db, users, refreshTokens } from '../db/index.js'
import { AuthUtils } from '../utils/auth.js'
import { GoogleAuth } from '../utils/google.js'

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
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1)
      if (existingUser.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'User with this email already exists'
        })
      }

      // Hash password
      const { hash, salt } = await AuthUtils.hashPassword(password)

      // Create user
      const [newUser] = await db.insert(users).values({
        email,
        passwordHash: hash,
        salt,
        name
      }).returning()

      // Generate tokens
      const accessToken = AuthUtils.generateAccessToken(newUser.id, newUser.email)
      const refreshToken = AuthUtils.generateRefreshToken(newUser.id, newUser.email)

      // Store refresh token
      await db.insert(refreshTokens).values({
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
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
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
      const accessToken = AuthUtils.generateAccessToken(user.id, user.email)
      const refreshToken = AuthUtils.generateRefreshToken(user.id, user.email)

      // Store refresh token
      await db.insert(refreshTokens).values({
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
        const [tokenRecord] = await db
          .select()
          .from(refreshTokens)
          .where(
            and(
              eq(refreshTokens.token, refreshToken),
              eq(refreshTokens.userId, payload.userId)
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
        const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1)
        if (!user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found'
          })
        }

        // Generate new tokens
        const newAccessToken = AuthUtils.generateAccessToken(user.id, user.email)
        const newRefreshToken = AuthUtils.generateRefreshToken(user.id, user.email)

        // Delete old refresh token and create new one
        await db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken))
        await db.insert(refreshTokens).values({
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
        const accessToken = AuthUtils.generateAccessToken(user.id, user.email)
        const refreshToken = AuthUtils.generateRefreshToken(user.id, user.email)

        // Store refresh token
        await db.insert(refreshTokens).values({
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
        const accessToken = AuthUtils.generateAccessToken(user.id, user.email)
        const refreshToken = AuthUtils.generateRefreshToken(user.id, user.email)

        // Store refresh token
        await db.insert(refreshTokens).values({
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
      } catch (error) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Google authentication failed'
        })
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
