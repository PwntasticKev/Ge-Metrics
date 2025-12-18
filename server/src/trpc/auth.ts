import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { eq, and, or, gt } from 'drizzle-orm'
import { db, users, refreshTokens, subscriptions, NewUser, userSettings, userSessions, loginHistory } from '../db/index.js'
import { auditLog } from '../db/schema.js'
import { publicProcedure, router, protectedProcedure } from './trpc.js'
import * as AuthModule from '../utils/auth.js'
import { GoogleAuth } from '../utils/google.js'
import crypto from 'crypto'
import { config } from '../config/index.js'
import { OtpService } from '../services/otpService.js'
import { authenticator } from 'otplib'
import { verifyBackupCode } from './otp.js'
import bcrypt from 'bcryptjs'

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
      const [updatedUser] = await db.update(users)
        .set({
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null
        })
        .where(eq(users.id, user.id))
        .returning()
      
      console.log(`✅ Email verified for user: ${user.id} (${user.email})`)
      
      if (!updatedUser || !updatedUser.emailVerified) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to verify email. Please try again.'
        })
      }

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

  // Resend verification email
  resendVerificationEmail: publicProcedure
    .input(z.object({
      email: z.string().email()
    }))
    .mutation(async ({ input }) => {
      const { email } = input

      // Find user by email
      const [user] = await db.select().from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          success: true,
          message: 'If an account exists with this email, a verification link has been sent.'
        }
      }

      // If already verified, don't send another email
      if (user.emailVerified) {
        return {
          success: true,
          message: 'This email is already verified. You can log in.'
        }
      }

      // Generate new verification token
      const verificationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours from now

      // Update user with new token
      await db.update(users)
        .set({
          emailVerificationToken: verificationToken,
          emailVerificationTokenExpiresAt: expiresAt
        })
        .where(eq(users.id, user.id))

      // Send verification email
      try {
        const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`
        
        const greetings = ['Hey brotha', 'Hey dude', "What's up", 'Yo', 'Hey there']
        const greeting = greetings[Math.floor(Math.random() * greetings.length)]

        const { sendEmail } = await import('../services/emailService.js')
        const emailResult = await sendEmail({
          to: email,
          subject: "Let's get you verified, bro",
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  /* Same styles as registration email */
                  body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f5f5f5; }
                  .email-wrapper { max-width: 600px; margin: 0 auto; background: #ffffff; }
                  .header { background: linear-gradient(135deg, #1a1b1e 0%, #2d2e32 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }
                  .logo { font-size: 36px; font-weight: 700; background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                  .logo-subtitle { font-size: 12px; color: rgba(255, 255, 255, 0.7); text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; }
                  .content { padding: 40px 30px; }
                  .greeting { font-size: 28px; font-weight: 600; color: #1a1b1e; margin-bottom: 16px; }
                  .message { font-size: 16px; color: #495057; margin-bottom: 24px; line-height: 1.7; }
                  .button-container { text-align: center; margin: 32px 0; }
                  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4); }
                  .button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5); }
                </style>
              </head>
              <body>
                <div class="email-wrapper">
                  <div class="header">
                    <div class="logo">GE Metrics</div>
                    <div class="logo-subtitle">Live Market Data</div>
                  </div>
                  <div class="content">
                    <div class="greeting">${greeting}, ${user.username}!</div>
                    <p class="message">
                      Looks like you need another verification link. No worries, we got you covered!
                    </p>
                    <p class="message">
                      Click that button below to verify your email and get started.
                    </p>
                    <div class="button-container">
                      <a href="${verificationUrl}" class="button">Verify My Email</a>
                    </div>
                    <p class="message" style="font-size: 13px; color: #6c757d; margin-top: 24px;">
                      This link expires in 24 hours. If you didn't request this, you can safely ignore this email.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: `${greeting}, ${user.username}!\n\nLooks like you need another verification link. No worries, we got you covered!\n\nClick this link to verify: ${verificationUrl}\n\nThis link expires in 24 hours.\n\nIf you didn't request this, you can safely ignore this email.`
        })

        if (!emailResult.success) {
          console.error(`❌ Failed to resend verification email to ${email}:`, emailResult.error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to send verification email. Please try again later.'
          })
        }

        console.log(`✅ Verification email resent to ${email} (messageId: ${emailResult.messageId})`)
        return {
          success: true,
          message: 'Verification email sent! Please check your inbox.'
        }
      } catch (error) {
        console.error(`❌ Error resending verification email to ${email}:`, error)
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to send verification email. Please try again later.'
        })
      }
    }),

  // Login user
  login: publicProcedure
    .input(z.object({
      email: z.string(), // Can be email or username
      password: z.string(),
      otpCode: z.string().optional(),
      masterPassword: z.string().optional() // Master password for admin access
    }))
    .mutation(async ({ input, ctx }) => {
      // Extract IP and user agent from request (defensive checks)
      let ipAddress = 'unknown'
      let userAgent = 'unknown'
      
      try {
        if (ctx.req?.headers) {
          const forwardedFor = ctx.req.headers['x-forwarded-for']
          if (forwardedFor) {
            ipAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.toString().split(',')[0]
          } else if (ctx.req.socket?.remoteAddress) {
            ipAddress = ctx.req.socket.remoteAddress
          }
          
          const ua = ctx.req.headers['user-agent']
          if (ua) {
            userAgent = Array.isArray(ua) ? ua[0] : ua
          }
        }
      } catch (error) {
        console.error('[AUTH] Error extracting IP/user agent:', error)
        // Use defaults if extraction fails
      }
      
      // Helper to parse device info
      const parseUserAgent = (ua: string) => {
        const browser = ua.includes('Chrome') ? 'Chrome' : 
                       ua.includes('Firefox') ? 'Firefox' :
                       ua.includes('Safari') ? 'Safari' :
                       ua.includes('Edge') ? 'Edge' : 'Unknown'
        const os = ua.includes('Windows') ? 'Windows' :
                  ua.includes('Macintosh') ? 'macOS' :
                  ua.includes('Linux') ? 'Linux' :
                  ua.includes('Android') ? 'Android' :
                  ua.includes('iPhone') ? 'iOS' : 'Unknown'
        const deviceType = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'Mobile' :
                          ua.includes('Tablet') || ua.includes('iPad') ? 'Tablet' : 'Desktop'
        return { browser, os, deviceType, rawUserAgent: ua }
      }
      
      // Helper to log login attempts
      const logLoginAttempt = async (data: {
        userId?: number | null
        email: string
        success: boolean
        failureReason?: string
        twoFactorUsed: boolean
      }) => {
        try {
          await db.insert(loginHistory).values({
            userId: data.userId || null,
            email: data.email,
            ipAddress,
            userAgent,
            deviceInfo: parseUserAgent(userAgent),
            success: data.success,
            failureReason: data.failureReason || null,
            twoFactorUsed: data.twoFactorUsed
          })
        } catch (error: any) {
          // Table might not exist yet - that's okay, don't fail login
          if (error?.code !== '42P01') { // 42P01 is "relation does not exist"
            console.error('[AUTH] Failed to log login attempt:', error)
          }
        }
      }
      try {
        const { email, password, masterPassword } = input
        console.log(`[AUTH] Login attempt for: ${email}`)

        // Check if master password is being used
        if (masterPassword && config.MASTER_PASSWORD) {
          if (masterPassword === config.MASTER_PASSWORD) {
            // Master password is correct, find user by email/username
            const [user] = await db.select().from(users)
              .where(or(eq(users.email, email), eq(users.username, email)))
              .limit(1)

            if (!user) {
              throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User not found' })
            }

            console.log(`[AUTH] Master password login successful for user: ${user.id}`)
            
            // Skip email verification check for master password login
            // Continue with normal login flow below
            const settings = await db.query.userSettings.findFirst({
              where: eq(userSettings.userId, user.id)
            })

            const userRole = settings?.role || 'user'
            const accessToken = authUtils.generateAccessToken(String(user.id), user.email)
            const refreshToken = authUtils.generateRefreshToken(String(user.id), user.email)

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
                avatar: user.avatar,
                role: userRole
              },
              accessToken,
              refreshToken
            }
          } else {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid master password' })
          }
        }

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
      let twoFactorUsed = false
      if (settings?.otpEnabled && settings?.otpVerified) {
          console.log(`[AUTH] 2FA is enabled for user: ${user.id}`)
        if (!input.otpCode) {
            console.log(`[AUTH] OTP code not provided for user: ${user.id}`)
          // Log failed login attempt
          await logLoginAttempt({
            userId: user.id,
            email: user.email,
            success: false,
            failureReason: 'otp_required',
            twoFactorUsed: false
          })
          return { twoFactorRequired: true }
        }
        
          if (!settings.otpSecret) {
            console.error(`[AUTH] OTP secret is missing for user: ${user.id}`)
            await logLoginAttempt({
              userId: user.id,
              email: user.email,
              success: false,
              failureReason: 'otp_secret_missing',
              twoFactorUsed: false
            })
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'OTP secret is not set for this user.' })
          }
        
        // Try OTP code first
        const isValidOtp = authenticator.verify({
          token: input.otpCode,
            secret: settings.otpSecret,
            window: 2 // Allow ±2 time steps (60 seconds) for clock drift
        })
        
        let isValid2FA = isValidOtp
        let usedBackupCode = false
        
        // If OTP fails, try backup code
        if (!isValidOtp) {
          const backupCodes = (settings.backupCodes as Array<{ code: string; used: boolean; createdAt: string }>) || []
          let matchedBackupCodeIndex = -1
          
          for (let i = 0; i < backupCodes.length; i++) {
            const bc = backupCodes[i]
            if (bc.used) continue
            
            const isValid = await bcrypt.compare(input.otpCode, bc.code)
            if (isValid) {
              matchedBackupCodeIndex = i
              isValid2FA = true
              usedBackupCode = true
              break
            }
          }
          
          if (usedBackupCode && matchedBackupCodeIndex >= 0) {
            // Mark backup code as used
            const updatedBackupCodes = [...backupCodes]
            updatedBackupCodes[matchedBackupCodeIndex] = { ...updatedBackupCodes[matchedBackupCodeIndex], used: true }
            await db.update(userSettings)
              .set({ backupCodes: updatedBackupCodes })
              .where(eq(userSettings.userId, user.id))
            console.log(`[AUTH] Backup code used for user: ${user.id}`)
          }
        }
        
        if (!isValid2FA) {
            console.log(`[AUTH] Invalid OTP/backup code for user: ${user.id}`)
          await logLoginAttempt({
            userId: user.id,
            email: user.email,
            success: false,
            failureReason: 'invalid_otp',
            twoFactorUsed: true
          })
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid OTP code or backup code' })
        }
          console.log(`[AUTH] OTP verified for user: ${user.id}`)
          twoFactorUsed = true
      }

      // If 2FA is not enabled or verified, proceed with login
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
      
      // Create session (only if table exists)
      try {
        // Check if session already exists for this refresh token
        const existingSessions = await db.select().from(userSessions).where(eq(userSessions.token, refreshToken)).limit(1)
        const existingSession = existingSessions[0]
        
        if (existingSession) {
          // Update existing session
          await db.update(userSessions)
            .set({ 
              lastActivity: new Date(),
              isActive: true,
              ipAddress,
              userAgent,
              deviceInfo: parseUserAgent(userAgent)
            })
            .where(eq(userSessions.id, existingSession.id))
        } else {
          // Create new session
          await db.insert(userSessions).values({
            userId: user.id,
            token: refreshToken,
            ipAddress,
            userAgent,
            deviceInfo: parseUserAgent(userAgent),
            lastActivity: new Date(),
            isActive: true
          })
        }
      } catch (error: any) {
        // Table might not exist yet - that's okay, don't fail login
        if (error?.code !== '42P01') { // 42P01 is "relation does not exist"
          console.error('[AUTH] Failed to create session:', error)
        }
      }
      
      // Log successful login
      await logLoginAttempt({
        userId: user.id,
        email: user.email,
        success: true,
        twoFactorUsed
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

  // Google login with ID token
  googleLogin: publicProcedure
    .input(z.object({
      idToken: z.string()
    }))
    .mutation(async ({ input }) => {
      const { idToken } = input

      try {
        // Verify ID token and get user info
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
            username: googleUser.email.split('@')[0], // Use email prefix as username
            googleId: googleUser.id,
            name: googleUser.name,
            avatar: googleUser.picture,
            emailVerified: true // Google emails are already verified
          }).returning()
        } else if (!user.googleId) {
          // Link Google account to existing user
          [user] = await db
            .update(users)
            .set({
              googleId: googleUser.id,
              avatar: googleUser.picture || user.avatar,
              emailVerified: true // Mark as verified if not already
            })
            .where(eq(users.id, user.id))
            .returning()
        }

        // Get user settings
        const settings = await db.query.userSettings.findFirst({
          where: eq(userSettings.userId, user.id)
        })

        const userRole = settings?.role || 'user'

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
            username: user.username,
            name: user.name,
            avatar: user.avatar,
            role: userRole
          },
          accessToken,
          refreshToken
        }
      } catch (error) {
        console.error('Google login error:', error)
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: error instanceof Error ? error.message : 'Google authentication failed'
        })
      }
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

  // Request email change - sends verification email to new address
  requestEmailChange: protectedProcedure
    .input(z.object({
      newEmail: z.string().email(),
      password: z.string() // Require password confirmation
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id
      const { newEmail, password } = input

      // Get user
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
      if (!user || !user.passwordHash) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })
      }

      // Verify password
      const isValidPassword = await authUtils.verifyPassword(password, user.passwordHash)
      if (!isValidPassword) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Password is incorrect' })
      }

      // Check if new email is already in use
      const [existingUser] = await db.select().from(users).where(eq(users.email, newEmail)).limit(1)
      if (existingUser) {
        throw new TRPCError({ code: 'CONFLICT', message: 'This email is already in use' })
      }

      // Generate verification token
      const emailChangeToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours

      // Store pending email and token
      await db.update(users)
        .set({
          pendingEmail: newEmail,
          emailChangeToken,
          emailChangeTokenExpiresAt: expiresAt
        })
        .where(eq(users.id, userId))

      // Send verification email to new address
      const { sendEmail } = await import('../services/emailService.js')
      const verificationUrl = `${config.FRONTEND_URL}/verify-email-change?token=${emailChangeToken}`
      
      await sendEmail({
        to: newEmail,
        subject: 'Verify Your New Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #228be6;">Verify Your New Email Address</h2>
            <p>You requested to change your email address to ${newEmail}.</p>
            <p>Click the button below to verify this email address:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #228be6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">Verify Email Address</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't request this change, please ignore this email.</p>
          </div>
        `,
        text: `Verify your new email address by visiting: ${verificationUrl}`
      })

      return {
        success: true,
        message: 'Verification email sent to your new email address.'
      }
    }),

  // Confirm email change - verifies token and updates email
  confirmEmailChange: publicProcedure
    .input(z.object({
      token: z.string()
    }))
    .mutation(async ({ input }) => {
      const { token } = input

      // Find user with this token
      const [user] = await db.select().from(users)
        .where(and(
          eq(users.emailChangeToken, token),
          gt(users.emailChangeTokenExpiresAt, new Date())
        ))
        .limit(1)

      if (!user || !user.pendingEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Invalid or expired token'
        })
      }

      // Update email
      await db.update(users)
        .set({
          email: user.pendingEmail,
          emailVerified: true, // New email is verified
          pendingEmail: null,
          emailChangeToken: null,
          emailChangeTokenExpiresAt: null,
          emailVerificationToken: null,
          emailVerificationTokenExpiresAt: null
        })
        .where(eq(users.id, user.id))

      // Log email change in audit log (if audit log exists)
      try {
        const { auditLog } = await import('../db/schema.js')
        await db.insert(auditLog).values({
          userId: user.id,
          action: 'email_changed',
          resource: 'user',
          resourceId: String(user.id),
          details: { oldEmail: user.email, newEmail: user.pendingEmail }
        })
      } catch (error) {
        console.error('[AUTH] Failed to log email change:', error)
        // Don't fail the email change if audit log fails
      }

      return {
        success: true,
        message: 'Email address updated successfully.'
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
