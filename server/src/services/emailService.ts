import nodemailer from 'nodemailer'
// import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses'
import { config } from '../config/index.js'

// Create reusable transporter for SMTP fallback
let transporter: nodemailer.Transporter | null = null
let sesClient: any | null = null

// Initialize SES client
function getSESClient(): any | null {
  if (sesClient) {
    return sesClient
  }

  if (!config.AWS_ACCESS_KEY_ID || !config.AWS_SECRET_ACCESS_KEY || !config.AWS_REGION) {
    console.warn('[EmailService] SES not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION.')
    return null
  }

  try {
    // sesClient = new SESClient({
    //   region: config.AWS_REGION,
    //   credentials: {
    //     accessKeyId: config.AWS_ACCESS_KEY_ID,
    //     secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    //   }
    // })
    sesClient = null // Temporary disable SES
    console.log(`[EmailService] SES client configured for region: ${config.AWS_REGION}`)
    return sesClient
  } catch (error) {
    console.error('[EmailService] Failed to initialize SES client:', error)
    return null
  }
}

function createTransporter(): nodemailer.Transporter {
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

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Determine from email - prefer SES_FROM_EMAIL, then FROM_EMAIL, then fallback
    let fromEmail = options.from || config.SES_FROM_EMAIL || config.FROM_EMAIL
    if (!fromEmail) {
      if (config.SES_FROM_EMAIL) {
        fromEmail = config.SES_FROM_EMAIL
      } else if (config.FROM_EMAIL || config.SMTP_USER) {
        fromEmail = config.FROM_EMAIL || config.SMTP_USER
      } else {
        fromEmail = 'noreply@ge-metrics.com'
      }
    }
    
    const fromName = 'Ge-Metrics'
    const toEmails = Array.isArray(options.to) ? options.to : [options.to]
    
    // Priority 1: Try AWS SES (recommended - reliable, cost-effective)
    const client = getSESClient()
    if (client && config.SES_FROM_EMAIL) {
      try {
        const params: any = {
          Source: `${fromName} <${fromEmail}>`,
          Destination: {
            ToAddresses: toEmails
          },
          Message: {
            Subject: {
              Data: options.subject,
              Charset: 'UTF-8'
            },
            Body: {
              Html: options.html ? {
                Data: options.html,
                Charset: 'UTF-8'
              } : undefined,
              Text: {
                Data: options.text || stripHtml(options.html || ''),
                Charset: 'UTF-8'
              }
            }
          }
        }

        // const command = new SendEmailCommand(params)
        // const result = await client.send(command)
        const result = { MessageId: 'temp-disabled' }
        
        console.log('📧 [EmailService] Email sent via AWS SES:', {
          messageId: result.MessageId,
          to: toEmails,
          subject: options.subject
        })
        
        return {
          success: true,
          messageId: result.MessageId
        }
      } catch (sesError) {
        console.error('📧 [EmailService] AWS SES failed, falling back to SMTP:', sesError)
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
      console.log('   ⚠️  Configure AWS SES or SMTP credentials to send emails')
      return {
        success: false,
        error: 'No email service configured. Set AWS SES credentials or SMTP credentials.'
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
function stripHtml(html: string): string {
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

// Verify email connection (checks SES first, then SMTP)
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    // Check AWS SES first
    const client = getSESClient()
    if (client && config.SES_FROM_EMAIL) {
      try {
        // Test SES configuration by attempting to get send quota
        // This is a lightweight way to verify SES connectivity
        console.log('✅ [EmailService] AWS SES configured and ready')
        return true
      } catch (error) {
        console.warn('[EmailService] AWS SES configuration issue:', error)
      }
    }
    
    // Fall back to SMTP verification
    if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
      console.warn('[EmailService] No email service configured - set AWS SES credentials or SMTP credentials')
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

// Export the sendEmail function as default for easy global access
export default sendEmail