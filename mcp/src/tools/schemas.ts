import { z } from 'zod'

export const READ_ONLY = { readOnlyHint: true, openWorldHint: true, idempotentHint: true } as const

export const itemRef = z.union([z.number().int().positive(), z.string().trim().min(1).max(100)])
  .describe('Item id (e.g. 4151) or name (e.g. "abyssal whip"; best match is used)')

export const limit = (max: number, fallback: number) =>
  z.number().int().min(1).max(max).default(fallback).describe(`Max rows to return (1-${max})`)

export const budget = z.number().positive().optional()
  .describe('Cash stack in gp. Caps quantity to what you can afford per 4h and drops unaffordable rows.')

export const includeStale = z.boolean().default(false)
  .describe('Include rows whose latest trade is older than 6h (usually dead or illiquid)')

export const flipSort = z.enum(['profit', 'roi', 'profit_per_limit']).default('profit_per_limit')
  .describe('profit = gp per item after tax; roi = profit / cost; profit_per_limit = profit x how many you can buy and fill per 4h (buy limit, ~1/6 of daily volume, budget)')
