import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { eq, and, or, gt } from 'drizzle-orm'
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
      name: z.string().optional() // Optional - will use username if not provided
    }))
    .mutation(async ({ input }) => {
      const { email, username, password, name } = input
      // Use username as name if name not provided
      const displayName = name || username

      console.log('[GE-METRICS_AUTH_DEBUG] Attempting to register user. DB URL:', config.DATABASE_URL)

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
        name: displayName
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
        plan: 'premium',
        currentPeriodEnd: trialEndDate
      })

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await db.update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpiresAt: verificationExpiresAt
        })
        .where(eq(users.id, createdUser.id))

      // Send verification email
      const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`
      const { sendEmail } = await import('../services/emailService.js')
      
      try {
        // Random casual greeting
        const casualGreetings = ['Hey brotha', 'Hey dude', 'What\'s up', 'Yo', 'Hey there']
        const greeting = casualGreetings[Math.floor(Math.random() * casualGreetings.length)]
        
        const emailResult = await sendEmail({
          to: email,
          subject: 'Let\'s get you verified, bro',
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6; 
                    color: #1a1b1e;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                  }
                  .email-wrapper {
                    max-width: 600px;
                    margin: 0 auto;
                    background: #ffffff;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    animation: slideUp 0.5s ease-out;
                  }
                  @keyframes slideUp {
                    from {
                      opacity: 0;
                      transform: translateY(20px);
                    }
                    to {
                      opacity: 1;
                      transform: translateY(0);
                    }
                  }
                  .header {
                    background: linear-gradient(135deg, #1a1b1e 0%, #2d2e32 100%);
                    padding: 40px 30px;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                  }
                  .header::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(45deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 237, 78, 0.1) 100%);
                    animation: shimmer 3s infinite;
                  }
                  @keyframes shimmer {
                    0%, 100% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                  }
                  .logo {
                    font-size: 36px;
                    font-weight: 700;
                    background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    position: relative;
                    z-index: 1;
                    margin-bottom: 8px;
                    letter-spacing: -1px;
                  }
                  .logo-subtitle {
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.7);
                    text-transform: uppercase;
                    letter-spacing: 2px;
                    position: relative;
                    z-index: 1;
                  }
                  .content {
                    padding: 40px 30px;
                    background: #ffffff;
                  }
                  .greeting {
                    font-size: 28px;
                    font-weight: 600;
                    color: #1a1b1e;
                    margin-bottom: 16px;
                    line-height: 1.2;
                  }
                  .message {
                    font-size: 16px;
                    color: #495057;
                    margin-bottom: 24px;
                    line-height: 1.7;
                  }
                  .button-container {
                    text-align: center;
                    margin: 32px 0;
                  }
                  .button {
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 16px 32px;
                    text-decoration: none;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 16px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                    position: relative;
                    overflow: hidden;
                  }
                  .button::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
                    transition: left 0.5s;
                  }
                  .button:hover::before {
                    left: 100%;
                  }
                  .button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
                  }
                  .link-fallback {
                    margin-top: 24px;
                    padding: 20px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border-left: 4px solid #667eea;
                  }
                  .link-fallback p {
                    font-size: 13px;
                    color: #6c757d;
                    margin-bottom: 8px;
                  }
                  .link-fallback a {
                    color: #667eea;
                    word-break: break-all;
                    font-size: 12px;
                    text-decoration: none;
                  }
                  .link-fallback a:hover {
                    text-decoration: underline;
                  }
                  .footer {
                    padding: 24px 30px;
                    background: #f8f9fa;
                    text-align: center;
                    border-top: 1px solid #e9ecef;
                  }
                  .footer-text {
                    font-size: 12px;
                    color: #6c757d;
                    line-height: 1.6;
                  }
                  @media only screen and (max-width: 600px) {
                    .content { padding: 30px 20px; }
                    .header { padding: 30px 20px; }
                    .logo { font-size: 28px; }
                    .greeting { font-size: 24px; }
                    .button { padding: 14px 28px; font-size: 14px; }
                  }
                </style>
              </head>
              <body>
                <div class="email-wrapper">
                  <div class="header">
                    <div class="logo">GE Metrics</div>
                    <div class="logo-subtitle">Live Market Data</div>
                  </div>
                  <div class="content">
                    <div class="greeting">${greeting}, ${createdUser.username}!</div>
                    <p class="message">
                      Stoked to have you on board! 🚀 Just need to verify your email real quick so we can get you set up with your free trial.
                    </p>
                    <p class="message">
                      Click that button below and you'll be good to go. Takes like 2 seconds, promise.
                    </p>
                    <div class="button-container">
                      <a href="${verificationUrl}" class="button">Verify My Email</a>
                    </div>
                    <div class="link-fallback">
                      <p><strong>Button not working?</strong> No worries, just copy and paste this link:</p>
                      <a href="${verificationUrl}">${verificationUrl}</a>
                    </div>
                  </div>
                  <div class="footer">
                    <p class="footer-text">
                      This link expires in 24 hours. If you didn't sign up for GE Metrics, you can safely ignore this email.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: `${greeting}, ${createdUser.username}!\n\nStoked to have you on board! Just need to verify your email real quick so we can get you set up with your free trial.\n\nClick this link to verify: ${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't sign up for GE Metrics, you can safely ignore this email.`
        })

        if (!emailResult.success) {
          console.error(`❌ Failed to send verification email to ${email}:`, emailResult.error)
          // Continue anyway - user can request a new verification email
        } else {
          console.log(`✅ Verification email sent to ${email} (messageId: ${emailResult.messageId})`)
        }
      } catch (emailError) {
        console.error(`❌ Error sending verification email to ${email}:`, emailError)
        // Continue anyway - user can request a new verification email
      }

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

      // Find user by verification token (check expiration)
      const [user] = await db.select().from(users)
        .where(
          and(
            eq(users.emailVerificationToken, token),
            gt(users.emailVerificationTokenExpiresAt, new Date())
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
      password: z.string(),
      otpCode: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      try {
        const { email, password } = input
        console.log(`[AUTH] Login attempt for: ${email}`)

        // Find user by email or username
        const [user] = await db.select().from(users)
          .where(or(eq(users.email, email), eq(users.username, email)))
          .limit(1)

        if (!user || !user.passwordHash) {
          console.log(`[AUTH] User not found or no password hash for: ${email}`)
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
        }
        console.log(`[AUTH] User found: ${user.id}`)

        // Verify password
        const isPasswordValid = await authUtils.verifyPassword(password, user.passwordHash)
        if (!isPasswordValid) {
          console.log(`[AUTH] Invalid password for user: ${user.id}`)
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid credentials' })
        }
        console.log(`[AUTH] Password verified for user: ${user.id}`)

        if (!user.emailVerified) {
          console.log(`[AUTH] Email not verified for user: ${user.id}`)
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please verify your email.' })
        }

        // Check user settings and role
        console.log(`[AUTH] Fetching settings for user: ${user.id}`)
        const settings = await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, user.id)
        })
        console.log(`[AUTH] Settings fetched for user: ${user.id}`, settings)

        // Admins and moderators bypass subscription requirements
        const userRole = settings?.role || 'user'
        const isAdminOrModerator = userRole === 'admin' || userRole === 'moderator'
        console.log(`[AUTH] User role: ${userRole}, Is admin/mod: ${isAdminOrModerator}`)

        if (!isAdminOrModerator) {
          // Check subscription status for regular users
          console.log(`[AUTH] Checking subscription for user: ${user.id}`)
          const subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.userId, user.id)
          })
          console.log(`[AUTH] Subscription fetched for user: ${user.id}`, subscription)

          const isTrialExpired = subscription?.status === 'trialing' && subscription?.currentPeriodEnd && subscription.currentPeriodEnd < new Date()
          const isSubscriptionInactive = !subscription || (subscription.status !== 'active' && subscription.status !== 'trialing')

          if (isTrialExpired || isSubscriptionInactive) {
            console.log(`[AUTH] Subscription inactive for user: ${user.id}`)
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'Your subscription is inactive. Please subscribe to continue.'
            })
          }
        }

        // Check for 2FA (settings already fetched above)
        if (!settings) {
          console.log(`[AUTH] No settings found, creating default for user: ${user.id}`)
          // Create default settings for user if they don't exist
          await db.insert(userSettings).values({
            userId: user.id,
            role: userRole
          })
        }

        // Check for 2FA
        if (settings?.otpEnabled && settings?.otpVerified) {
          console.log(`[AUTH] 2FA is enabled for user: ${user.id}`)
          if (!input.otpCode) {
            console.log(`[AUTH] OTP code not provided for user: ${user.id}`)
            return { twoFactorRequired: true }
          }

          if (!settings.otpSecret) {
            console.error(`[AUTH] OTP secret is missing for user: ${user.id}`)
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'OTP secret is not set for this user.' })
          }

          const isValidOtp = authenticator.verify({
            token: input.otpCode,
            secret: settings.otpSecret
          })

          if (!isValidOtp) {
            console.log(`[AUTH] Invalid OTP for user: ${user.id}`)
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid OTP code' })
          }
          console.log(`[AUTH] OTP verified for user: ${user.id}`)
        }

        // If 2FA is not enabled, proceed with login
        console.log(`[AUTH] Generating tokens for user: ${user.id}`)
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
        console.log(`[AUTH] Tokens generated and stored for user: ${user.id}`)

        return {
          user: { id: user.id, email: user.email, username: user.username, name: user.name, avatar: user.avatar },
          accessToken,
          refreshToken
        }
      } catch (error) {
        console.error('[AUTH] Login procedure failed:', error)
        if (error instanceof TRPCError) {
          throw error
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred during login.'
        })
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

      // Send OTP via email
      const { sendEmail } = await import('../services/emailService.js')
      
      await sendEmail({
        to: email,
        subject: 'Your Ge-Metrics Password Reset Code',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { text-align: center; background: #1a1b1e; color: white; padding: 30px; border-radius: 8px 8px 0 0; }
                .content { background: white; padding: 30px; border: 1px solid #ddd; border-top: none; }
                .otp-code { font-size: 32px; font-weight: bold; text-align: center; letter-spacing: 8px; color: #228be6; padding: 20px; background: #f0f0f0; border-radius: 8px; margin: 20px 0; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 Ge-Metrics</h1>
                </div>
                <div class="content">
                  <h2>Password Reset Request</h2>
                  <p>You requested to reset your password. Use the code below to complete the process:</p>
                  <div class="otp-code">${otpCode}</div>
                  <p>This code will expire in 10 minutes.</p>
                  <p><small>If you didn't request this password reset, please ignore this email or contact support.</small></p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Password Reset Request\n\nYou requested to reset your password. Use this code:\n\n${otpCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't request this, please ignore this email.`
      })

      console.log(`🔑 Password reset OTP sent to: ${email}`)

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
      const [user] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1)

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
        role: ctx.user.role, // Include role from context
        createdAt: user.createdAt
      }
    })
})
