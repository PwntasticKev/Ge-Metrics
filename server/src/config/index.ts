import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const configSchema = z.object({
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  LOCAL_DATABASE_URL: z.string().optional(),
  CORRECT_DATABASE_URL: z.string().optional(),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  CORRECT_DATABASE_URL_UNPOOLED: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT access secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  PORT: z.string().transform(Number).default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  STRIPE_SECRET_KEY: z.string().min(1, 'Stripe secret key is required'),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRICE_MONTHLY: z.string().optional(),
  STRIPE_PRICE_YEARLY: z.string().optional(),
  STRIPE_PRODUCT_PREMIUM: z.string().optional(),
  // Email Configuration (Resend is recommended, SMTP is fallback)
  RESEND_API_KEY: z.string().optional(),
  FROM_EMAIL: z.string().email().optional(),
  // SMTP Email Configuration (fallback if Resend not configured)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(val => val ? Number(val) : 587).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional()
})

const parsedConfig = configSchema.parse(process.env)

// If the correct URL exists (on Vercel), use it to overwrite the locked one.
if (parsedConfig.CORRECT_DATABASE_URL) {
  parsedConfig.DATABASE_URL = parsedConfig.CORRECT_DATABASE_URL
}
// Do the same for the unpooled URL
if (parsedConfig.CORRECT_DATABASE_URL_UNPOOLED) {
  parsedConfig.DATABASE_URL_UNPOOLED = parsedConfig.CORRECT_DATABASE_URL_UNPOOLED
}
// Do the same for the frontend URL
if (process.env.FRONTEND_URL) {
  parsedConfig.FRONTEND_URL = process.env.FRONTEND_URL
}

export const config = parsedConfig

export type Config = z.infer<typeof configSchema>;
