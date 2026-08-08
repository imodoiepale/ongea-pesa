// Server-only: reads platform_settings, which is service-role gated.

import { createServiceClient } from '@/lib/supabase/server'
import { PLATFORM_FEE_RATE } from '@/lib/transaction-fees'

/**
 * Live platform settings, so an admin change on /admin-analytics/settings takes
 * effect without a redeploy.
 *
 * Cached for 60s. Every money path calls this, and a DB round-trip per
 * transaction to read one number is not a trade worth making; a fee change
 * taking up to a minute to propagate is fine, and is stated on the settings page.
 */

const CACHE_TTL_MS = 60_000

let cachedRate: number | null = null
let cachedAt = 0

/**
 * Falls back to the compile-time PLATFORM_FEE_RATE on any failure. That matters:
 * if this threw or returned 0 when the DB was briefly unreachable, we would
 * either break a payment or silently stop charging. A slightly stale rate is the
 * only acceptable failure mode here.
 */
export async function getPlatformFeeRate(): Promise<number> {
  const now = Date.now()
  if (cachedRate !== null && now - cachedAt < CACHE_TTL_MS) return cachedRate

  try {
    const admin = createServiceClient()
    const { data, error } = await admin
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee_rate')
      .maybeSingle()

    if (error || !data) {
      console.warn('⚠️ platform_fee_rate unavailable, using compiled default:', error?.message)
      return PLATFORM_FEE_RATE
    }

    const rate = Number(data.value)
    // Guard the range here as well as in the API. A bad value in this column
    // would otherwise mis-charge every customer until someone noticed.
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.05) {
      console.error(`❌ platform_fee_rate out of range (${data.value}); using compiled default`)
      return PLATFORM_FEE_RATE
    }

    cachedRate = rate
    cachedAt = now
    return rate
  } catch (err) {
    console.warn('⚠️ platform_fee_rate lookup failed, using compiled default:', err)
    return PLATFORM_FEE_RATE
  }
}

/** Call after an admin write so the change is visible immediately. */
export function invalidatePlatformFeeRateCache(): void {
  cachedRate = null
  cachedAt = 0
}
