import nodemailer from 'nodemailer'
import { config } from '../config/index.js'

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null

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
    const transporter = createTransporter()
    
    // Use FROM_EMAIL if configured, otherwise fall back to SMTP_USER
    // Note: Using a different FROM_EMAIL than SMTP_USER may cause deliverability issues
    // Some email providers will reject or mark as spam emails where From != authenticated user
    const fromEmail = options.from || config.FROM_EMAIL || config.SMTP_USER || 'noreply@ge-metrics.com'
    const fromName = 'ge-metrics'
    
    // Warn if FROM_EMAIL is different from SMTP_USER (deliverability risk)
    if (config.FROM_EMAIL && config.SMTP_USER && config.FROM_EMAIL !== config.SMTP_USER) {
      const fromDomain = fromEmail.split('@')[1]
      const authDomain = config.SMTP_USER.split('@')[1]
      if (fromDomain !== authDomain) {
        console.warn(`[EmailService] WARNING: Sending from ${fromEmail} using credentials from ${config.SMTP_USER}`)
        console.warn(`[EmailService] This may cause deliverability issues. Consider using a transactional email service (Resend, SendGrid, Mailgun) for better deliverability.`)
      }
    }
    
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      replyTo: config.SMTP_USER || fromEmail, // Set reply-to to the authenticated email
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text || stripHtml(options.html || ''),
      html: options.html || options.text
    }

    // If SMTP is not configured, log instead of sending
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.log('📧 [EmailService] Email would be sent (SMTP not configured):')
      console.log('   To:', mailOptions.to)
      console.log('   From:', mailOptions.from)
      console.log('   Subject:', mailOptions.subject)
      console.log('   Text:', mailOptions.text?.substring(0, 100) + '...')
      return {
        success: true,
        messageId: `logged-${Date.now()}`
      }
    }

    // Try to send via SMTP
    try {
      const info = await transporter.sendMail(mailOptions)
      
      console.log('📧 [EmailService] Email sent successfully:', {
        messageId: info.messageId,
        to: mailOptions.to,
        subject: mailOptions.subject
      })

      return {
        success: true,
        messageId: info.messageId
      }
    } catch (sendError) {
      // If sending fails and SMTP wasn't configured, that's expected
      if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
        return {
          success: true,
          messageId: `logged-${Date.now()}`
        }
      }
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

// Verify SMTP connection
export async function verifyEmailConnection (): Promise<boolean> {
  try {
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.warn('[EmailService] SMTP not configured - cannot verify connection')
      return false
    }

    const transporter = createTransporter()
    await transporter.verify()
    console.log('✅ [EmailService] SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('❌ [EmailService] SMTP connection verification failed:', error)
    return false
  }
}

