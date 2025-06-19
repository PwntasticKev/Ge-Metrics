import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const configSchema = z.object({
  JWT_ACCESS_SECRET: z.string().default('your-super-secret-access-token-key-for-development-only'),
  JWT_REFRESH_SECRET: z.string().default('your-super-secret-refresh-token-key-for-development-only'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().default('demo-google-client-id'),
  GOOGLE_CLIENT_SECRET: z.string().default('demo-google-client-secret'),
  PORT: z.string().transform(Number).default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173')
})

export const config = configSchema.parse({
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL
})

export type Config = z.infer<typeof configSchema>;
