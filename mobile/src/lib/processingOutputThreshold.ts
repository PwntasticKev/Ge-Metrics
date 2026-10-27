import type { Market, ProcessRecipe } from '@ge/engine'
import { geTax } from '../../../src/domain/flipping/geTax.js'
import type { PriceMode } from './processingLab.ts'

/** Verified ordinary cooking only; never infer yield mechanics from recipe shape.
 * docs/design/cooking-fletching-research.md: one raw karambwan can yield at
 * most one saleable cooked karambwan. No burn rate or eligibility is assumed.
 */
export function supportsOutputThreshold (recipe: ProcessRecipe): boolean {
  return recipe.id === 'mmg:Cooking raw karambwan' && recipe.method === 'money-making'
    && recipe.inputs.length === 1 && recipe.inputs[0].id === 3142 && recipe.inputs[0].qty === 1
    && recipe.outputs.length === 1 && recipe.outputs[0].id === 3144 && recipe.outputs[0].qty === 1
    && recipe.coinCost === 0 && recipe.coinRevenue === 0
}
export type OutputThresholdReason = 'unsupported-recipe' | 'patient-mode' | 'attempts-required' | 'missing-quote' | 'invalid-value'
const integer = (value: number) => Number.isSafeInteger(value) && value >= 0
const count = (text: string): number | null => /^\d+$/.test(text.trim()) && integer(Number(text)) ? Number(text) : null
const bound = BigInt(Number.MAX_SAFE_INTEGER)
const safe = (value: bigint) => value >= -bound && value <= bound

/** Raw market only: explicitly buy high / sell low. No rate or sizing input. */
export function processingOutputThreshold (recipe: ProcessRecipe, market: Market, inputs: PriceMode, outputs: PriceMode, attemptsText: string, scenarioText = '') {
  const empty = { minimumOutputs: null as number | null, maxFailed: null as number | null, netUnit: null as number | null, fullMargin: null as number | null, scenarioMargin: null as number | null, requiredPercent: null as number | null, attempts: null as number | null }
  const fail = (reason: OutputThresholdReason) => ({ ...empty, reason })
  if (!supportsOutputThreshold(recipe)) return fail('unsupported-recipe')
  if (inputs !== 'instant' || outputs !== 'instant') return fail('patient-mode')
  if (!attemptsText.trim()) return fail('attempts-required')
  const attempts = count(attemptsText)
  const scenario = scenarioText.trim() ? count(scenarioText) : null
  if (attempts === null || (scenarioText.trim() && (scenario === null || scenario > attempts))) return fail('invalid-value')
  const buy = market.get(3142)?.high
  const sell = market.get(3144)?.low
  if (buy == null || sell == null) return fail('missing-quote')
  if (!integer(buy) || buy <= 0 || !integer(sell) || sell <= 0) return fail('invalid-value')
  const tax = geTax(sell, 3144)
  if (!integer(tax)) return fail('invalid-value')
  const n = BigInt(attempts)
  // Fee/revenue are explicitly verified zero by the allowlist; no future missing
  // coin field or conditional fee is silently interpreted as zero.
  const cost = n * BigInt(buy)
  const unit = BigInt(sell) - BigInt(tax)
  const fullRevenue = n * unit
  const fullMargin = fullRevenue - cost
  const scenarioRevenue = scenario === null ? null : BigInt(scenario) * unit
  const scenarioMargin = scenarioRevenue === null ? null : scenarioRevenue - cost
  if (unit < BigInt(0) || ![cost, unit, fullRevenue, fullMargin, ...(scenarioRevenue === null ? [] : [scenarioRevenue, scenarioMargin!])].every(safe)) return fail('invalid-value')
  const k = cost <= BigInt(0) ? BigInt(0) : unit === BigInt(0) ? null : cost / unit + (cost % unit === BigInt(0) ? BigInt(0) : BigInt(1))
  if (k !== null && !safe(k)) return fail('invalid-value')
  const feasible = k !== null && k <= n
  return { reason: null, attempts, netUnit: Number(unit), minimumOutputs: k === null ? null : Number(k), maxFailed: feasible ? Number(n - k!) : null, fullMargin: Number(fullMargin), scenarioMargin: scenarioMargin === null ? null : Number(scenarioMargin), requiredPercent: attempts > 0 && feasible ? Number(k) / attempts * 100 : null }
}
