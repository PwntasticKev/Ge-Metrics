import { z } from 'zod'
import { eq, desc, and, gte, like, or } from 'drizzle-orm'
import crypto from 'crypto'
import { 
  db, 
  users, 
  userInvitations,
  subscriptions,
  userSettings,
  auditLog
} from '../db/index.js'
import { adminProcedure, router } from './trpc.js'

// Simple email template for invitations
const createInvitationEmailTemplate = (inviterName: string, invitationToken: string, trialDays: number) => {
  const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invite=${invitationToken}`
  
  return {
    subject: `You're invited to join Ge-Metrics!`,
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
            .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #666; }
            .button { display: inline-block; background: #228be6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .highlight { background: #e7f5ff; padding: 15px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎮 Ge-Metrics</h1>
              <p>Your OSRS Trading Analytics Platform</p>
            </div>
            <div class="content">
              <h2>You're invited to join Ge-Metrics!</h2>
              <p>Hi there!</p>
              <p><strong>${inviterName}</strong> has invited you to join Ge-Metrics, the premier analytics platform for Old School RuneScape trading.</p>
              
              <div class="highlight">
                <strong>🎁 Special Welcome Gift:</strong><br>
                You'll receive a <strong>${trialDays}-day free trial</strong> of our premium features when you sign up!
              </div>
              
              <p>With Ge-Metrics, you'll get:</p>
              <ul>
                <li>📊 Real-time Grand Exchange price tracking</li>
                <li>💰 Profit calculation and flip suggestions</li>
                <li>📈 Advanced market analytics and trends</li>
                <li>🔔 Price alerts and notifications</li>
                <li>📱 Mobile-friendly interface</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button">Accept Invitation & Sign Up</a>
              </div>
              
              <p><small>This invitation will expire in 24 hours. If you don't want to receive these emails, you can safely ignore this message.</small></p>
            </div>
            <div class="footer">
              <p>© 2024 Ge-Metrics. All rights reserved.</p>
              <p>If you have any questions, contact us at support@ge-metrics.com</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
You're invited to join Ge-Metrics!

${inviterName} has invited you to join Ge-Metrics, the premier analytics platform for Old School RuneScape trading.

🎁 Special Welcome Gift: You'll receive a ${trialDays}-day free trial of our premium features when you sign up!

With Ge-Metrics, you'll get:
- Real-time Grand Exchange price tracking
- Profit calculation and flip suggestions  
- Advanced market analytics and trends
- Price alerts and notifications
- Mobile-friendly interface

Accept your invitation: ${inviteUrl}

This invitation will expire in 24 hours.

© 2024 Ge-Metrics. All rights reserved.
    `
  }
}

// Mailchimp email sending function
async function sendInvitationEmail(email: string, inviterName: string, invitationToken: string, trialDays: number) {
  // Get Mailchimp API key from user settings (admin who is sending the invite)
  const emailTemplate = createInvitationEmailTemplate(inviterName, invitationToken, trialDays)
  
  // TODO: Replace with actual Mailchimp API call
  // For now, we'll simulate the email sending
  console.log('[INVITATION] Email would be sent to:', email)
  console.log('[INVITATION] Subject:', emailTemplate.subject)
  console.log('[INVITATION] Invite URL:', `${process.env.FRONTEND_URL || 'http://localhost:3000'}/signup?invite=${invitationToken}`)
  
  // Simulate Mailchimp API call
  // const mailchimp = require('@mailchimp/mailchimp_marketing')
  // mailchimp.setConfig({
  //   apiKey: mailchimpApiKey,
  //   server: 'us1' // replace with your server prefix
  // })
  
  // const response = await mailchimp.messages.send({
  //   message: {
  //     subject: emailTemplate.subject,
  //     html: emailTemplate.html,
  //     text: emailTemplate.text,
  //     to: [{ email, type: 'to' }],
  //     from_email: 'noreply@ge-metrics.com',
  //     from_name: 'Ge-Metrics Team'
  //   }
  // })
  
  return { success: true, messageId: 'simulated-' + Date.now() }
}

export const adminInvitationsRouter = router({
  // Send invitation
  createInvitation: adminProcedure
    .input(z.object({
      email: z.string().email(),
      trialDays: z.number().min(1).max(365).default(14),
      role: z.enum(['user', 'admin', 'moderator']).default('user')
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, trialDays, role } = input

      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)

      if (existingUser.length > 0) {
        throw new Error('User with this email already exists')
      }

      // Generate invitation token
      const invitationToken = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Delete any existing pending invitations for this email
      await db
        .delete(userInvitations)
        .where(and(
          eq(userInvitations.email, email),
          eq(userInvitations.status, 'pending')
        ))

      // Create new invitation
      const [invitation] = await db
        .insert(userInvitations)
        .values({
          email,
          invitedBy: ctx.user.id,
          invitationToken,
          trialDays,
          role,
          expiresAt,
          status: 'pending'
        })
        .returning()

      try {
        // Send email via Mailchimp
        const emailResult = await sendInvitationEmail(
          email, 
          ctx.user.name || ctx.user.email, 
          invitationToken, 
          trialDays
        )

        // Update invitation with email status
        await db
          .update(userInvitations)
          .set({
            emailSent: true,
            emailSentAt: new Date(),
            metadata: { emailResult }
          })
          .where(eq(userInvitations.id, invitation.id))

        // Log the admin action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'send_user_invitation',
          resource: 'invitation',
          resourceId: invitation.id,
          details: {
            email,
            trialDays,
            role,
            emailSent: true
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return {
          ...invitation,
          emailSent: true,
          message: 'Invitation sent successfully'
        }
      } catch (emailError) {
        console.error('[INVITATION] Email sending failed:', emailError)
        
        // Log the failed email attempt
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'send_user_invitation_failed',
          resource: 'invitation',
          resourceId: invitation.id,
          details: {
            email,
            error: emailError instanceof Error ? emailError.message : String(emailError),
            emailSent: false
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return {
          ...invitation,
          emailSent: false,
          message: 'Invitation created but email sending failed'
        }
      }
    }),

  // Get pending invitations
  getPendingInvitations: adminProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(50),
      search: z.string().optional()
    }))
    .query(async ({ input }) => {
      const { page, limit, search } = input
      const offset = (page - 1) * limit

      let query = db
        .select({
          id: userInvitations.id,
          email: userInvitations.email,
          invitedByName: users.name,
          invitedByEmail: users.email,
          trialDays: userInvitations.trialDays,
          role: userInvitations.role,
          status: userInvitations.status,
          emailSent: userInvitations.emailSent,
          emailSentAt: userInvitations.emailSentAt,
          expiresAt: userInvitations.expiresAt,
          createdAt: userInvitations.createdAt
        })
        .from(userInvitations)
        .leftJoin(users, eq(userInvitations.invitedBy, users.id))
        .where(
          search ? 
            and(
              eq(userInvitations.status, 'pending'),
              or(
                like(userInvitations.email, `%${search}%`),
                like(users.name, `%${search}%`)
              )
            )
            : eq(userInvitations.status, 'pending')
        )

      const invitations = await query
        .orderBy(desc(userInvitations.createdAt))
        .limit(limit)
        .offset(offset)

      return {
        invitations,
        pagination: {
          page,
          limit,
          total: invitations.length // TODO: Get actual count
        }
      }
    }),

  // Resend invitation
  resendInvitation: adminProcedure
    .input(z.object({
      invitationId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      const { invitationId } = input

      // Get invitation details
      const [invitation] = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.id, invitationId))
        .limit(1)

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      if (invitation.status !== 'pending') {
        throw new Error('Can only resend pending invitations')
      }

      // Generate new token and extend expiry
      const newToken = crypto.randomBytes(32).toString('hex')
      const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Update invitation
      await db
        .update(userInvitations)
        .set({
          invitationToken: newToken,
          expiresAt: newExpiresAt,
          emailSent: false,
          emailSentAt: null,
          updatedAt: new Date()
        })
        .where(eq(userInvitations.id, invitationId))

      try {
        // Resend email
        const emailResult = await sendInvitationEmail(
          invitation.email,
          ctx.user.name || ctx.user.email,
          newToken,
          invitation.trialDays
        )

        // Update with email status
        await db
          .update(userInvitations)
          .set({
            emailSent: true,
            emailSentAt: new Date(),
            metadata: { emailResult, resent: true }
          })
          .where(eq(userInvitations.id, invitationId))

        // Log the action
        await db.insert(auditLog).values({
          userId: ctx.user.id,
          action: 'resend_user_invitation',
          resource: 'invitation',
          resourceId: invitationId,
          details: {
            email: invitation.email,
            emailSent: true
          },
          ipAddress: ctx.req.ip,
          userAgent: ctx.req.headers['user-agent']
        })

        return { success: true, message: 'Invitation resent successfully' }
      } catch (error) {
        throw new Error(`Failed to resend invitation: ${error instanceof Error ? error.message : String(error)}`)
      }
    }),

  // Cancel invitation
  cancelInvitation: adminProcedure
    .input(z.object({
      invitationId: z.string().uuid()
    }))
    .mutation(async ({ input, ctx }) => {
      const { invitationId } = input

      // Get invitation for audit log
      const [invitation] = await db
        .select()
        .from(userInvitations)
        .where(eq(userInvitations.id, invitationId))
        .limit(1)

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      // Delete the invitation
      await db
        .delete(userInvitations)
        .where(eq(userInvitations.id, invitationId))

      // Log the action
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        action: 'cancel_user_invitation',
        resource: 'invitation',
        resourceId: invitationId,
        details: {
          email: invitation.email,
          originalStatus: invitation.status
        },
        ipAddress: ctx.req.ip,
        userAgent: ctx.req.headers['user-agent']
      })

      return { success: true, message: 'Invitation cancelled successfully' }
    }),

  // Accept invitation (called during signup process)
  acceptInvitation: adminProcedure
    .input(z.object({
      invitationToken: z.string(),
      userId: z.number()
    }))
    .mutation(async ({ input }) => {
      const { invitationToken, userId } = input

      // Find and validate invitation
      const [invitation] = await db
        .select()
        .from(userInvitations)
        .where(and(
          eq(userInvitations.invitationToken, invitationToken),
          eq(userInvitations.status, 'pending'),
          gte(userInvitations.expiresAt, new Date())
        ))
        .limit(1)

      if (!invitation) {
        throw new Error('Invalid or expired invitation')
      }

      // Mark invitation as accepted
      await db
        .update(userInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(userInvitations.id, invitation.id))

      // Set up user's trial subscription
      const trialStart = new Date()
      const trialEnd = new Date(trialStart.getTime() + invitation.trialDays * 24 * 60 * 60 * 1000)

      await db.insert(subscriptions).values({
        userId,
        status: 'trialing',
        plan: 'premium',
        isTrialing: true,
        trialStart,
        trialEnd,
        trialDays: invitation.trialDays,
        currentPeriodStart: trialStart,
        currentPeriodEnd: trialEnd
      })

      // Set user role if specified
      if (invitation.role !== 'user') {
        await db
          .update(userSettings)
          .set({ role: invitation.role })
          .where(eq(userSettings.userId, userId))
      }

      return {
        success: true,
        trialDays: invitation.trialDays,
        role: invitation.role,
        message: `Welcome! Your ${invitation.trialDays}-day trial has started.`
      }
    })
})