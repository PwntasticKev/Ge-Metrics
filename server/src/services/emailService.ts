import nodemailer from 'nodemailer'
import { config } from '../config/index.js'

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null
let resendClient: any = null
let Resend: any = null

// Lazy load Resend (only if RESEND_API_KEY is configured)
async function getResendClient () {
  if (resendClient) {
    return resendClient
  }
  
  if (!config.RESEND_API_KEY) {
    return null
  }
  
  try {
    // Dynamic import - Resend may not be installed
    const resendModule = await import('resend' as string)
    Resend = (resendModule as any).Resend
    if (Resend && config.RESEND_API_KEY) {
      resendClient = new Resend(config.RESEND_API_KEY)
      return resendClient
    }
    return null
  } catch (error) {
    console.warn('[EmailService] Resend package not installed. Install with: npm install resend')
    return null
  }
}

function createTransporter (): nodemailer.Transporter {
  if (transporter) {
    return transporter
  }

  // Check if SMTP is configured
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    console.warn('[EmailService] SMTP not configured. Emails will be logged instead of sent.')
    console.warn('[EmailService] Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment variables.')
    // Return a dummy transporter that will fail gracefully
    transporter = nodemailer.createTransport({
      host: 'localhost',
      port: 587,
      secure: false,
      auth: {
        user: 'dummy',
        pass: 'dummy'
      }
    })
    return transporter
  }

  const smtpPort = config.SMTP_PORT || 587
  transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for other ports
    auth: {
      user: config.SMTP_USER,
      pass: config.SMTP_PASS
    },
    tls: {
      // Do not fail on invalid certs (some SMTP servers use self-signed certs)
      rejectUnauthorized: false
    }
  })

  console.log(`[EmailService] SMTP transporter configured: ${config.SMTP_HOST}:${smtpPort}`)
  return transporter
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
}

export async function sendEmail (options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Determine from email - prefer FROM_EMAIL, then Resend default, then SMTP user, then fallback
    let fromEmail = options.from || config.FROM_EMAIL
    if (!fromEmail) {
      if (config.RESEND_API_KEY) {
        // Resend requires verified domain, but allows onboarding@resend.dev for testing
        fromEmail = 'onboarding@resend.dev'
      } else if (config.SMTP_USER) {
        fromEmail = config.SMTP_USER
      } else {
        fromEmail = 'noreply@ge-metrics.com'
      }
    }
    const fromName = 'Ge-Metrics'
    const toEmails = Array.isArray(options.to) ? options.to : [options.to]
    
    // Priority 1: Try Resend API (recommended - modern, reliable, free tier)
    if (config.RESEND_API_KEY) {
      try {
        const client = await getResendClient()
        if (client) {
          const result = await client.emails.send({
            from: `${fromName} <${fromEmail}>`,
            to: toEmails,
            subject: options.subject,
            html: options.html || options.text,
            text: options.text || stripHtml(options.html || '')
          })
          
          if (result.error) {
            throw new Error(result.error.message || 'Resend API error')
          }
          
          console.log('📧 [EmailService] Email sent via Resend:', {
            messageId: result.data?.id,
            to: toEmails,
            subject: options.subject
          })
          
          return {
            success: true,
            messageId: result.data?.id
          }
        }
      } catch (resendError) {
        console.error('📧 [EmailService] Resend failed, falling back to SMTP:', resendError)
        // Fall through to SMTP
      }
    }
    
    // Priority 2: Try SMTP (fallback)
    const transporter = createTransporter()
    
    // Use FROM_EMAIL if configured, otherwise fall back to SMTP_USER
    const smtpFromEmail = options.from || config.FROM_EMAIL || config.SMTP_USER || 'noreply@ge-metrics.com'
    
    const mailOptions = {
      from: `"${fromName}" <${smtpFromEmail}>`,
      replyTo: config.SMTP_USER || smtpFromEmail,
      to: toEmails.join(', '),
      subject: options.subject,
      text: options.text || stripHtml(options.html || ''),
      html: options.html || options.text
    }

    // If SMTP is not configured, log instead of sending
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.log('📧 [EmailService] Email would be sent (no email service configured):')
      console.log('   To:', mailOptions.to)
      console.log('   From:', mailOptions.from)
      console.log('   Subject:', mailOptions.subject)
      console.log('   Text:', mailOptions.text?.substring(0, 100) + '...')
      console.log('   ⚠️  Configure RESEND_API_KEY or SMTP credentials to send emails')
      return {
        success: false,
        error: 'No email service configured. Set RESEND_API_KEY or SMTP credentials.'
      }
    }

    // Try to send via SMTP
    try {
      const info = await transporter.sendMail(mailOptions)
      
      console.log('📧 [EmailService] Email sent via SMTP:', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject
      })

      return {
        success: true,
        messageId: info.messageId
      }
    } catch (sendError) {
      throw sendError
    }
  } catch (error) {
    console.error('📧 [EmailService] Failed to send email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Helper function to strip HTML tags for plain text fallback
function stripHtml (html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// Verify email connection (checks Resend first, then SMTP)
export async function verifyEmailConnection (): Promise<boolean> {
  try {
    // Check Resend first
    if (config.RESEND_API_KEY) {
      try {
        const client = await getResendClient()
        if (client) {
          // Resend doesn't have a verify method, but we can check if API key is set
          console.log('✅ [EmailService] Resend API configured')
          return true
        }
      } catch (error) {
        console.warn('[EmailService] Resend configuration issue:', error)
      }
    }
    
    // Fall back to SMTP verification
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.warn('[EmailService] No email service configured - set RESEND_API_KEY or SMTP credentials')
      return false
    }

    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ [EmailService] SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('❌ [EmailService] Email connection verification failed:', error)
    return false
  }
}

