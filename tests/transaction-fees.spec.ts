import { expect, test } from '@playwright/test'
import {
  calculateTransactionFees,
  customerTransactionCost,
  ncbaTransactionCost,
} from '@/lib/transaction-fees'

test.describe('NCBA customer transaction costs', () => {
  test('uses the current published mobile-money band for a KSh 2,000 send', () => {
    const fees = calculateTransactionFees(2_000, 'mobile_wallet')

    expect(fees.providerFee).toBe(25)
    expect(fees.platformFee).toBe(10)
    expect(fees.totalTransactionCost).toBe(35)
    expect(fees.totalDebit).toBe(2_035)
  })

  test('uses the fixed online utility-bill tariff', () => {
    const fees = calculateTransactionFees(2_000, 'utility_bill')

    expect(fees.providerFee).toBe(63)
    expect(fees.totalTransactionCost).toBe(73)
    expect(fees.totalDebit).toBe(2_073)
  })

  test('does not add an NCBA charge to an internal transfer', () => {
    const fees = calculateTransactionFees(2_000, 'internal')

    expect(fees.providerFee).toBe(0)
    expect(fees.totalTransactionCost).toBe(10)
    expect(fees.totalDebit).toBe(2_010)
  })

  test('covers every edge of the published mobile-money schedule', () => {
    expect(ncbaTransactionCost(100)).toBe(0)
    expect(ncbaTransactionCost(101)).toBe(11)
    expect(ncbaTransactionCost(1_500)).toBe(18)
    expect(ncbaTransactionCost(1_501)).toBe(25)
    expect(ncbaTransactionCost(150_000)).toBe(70)
  })

  test('shows only customer-borne provider costs in the combined UI value', () => {
    const base = { platform_fee: 10, transaction_cost: 25 }

    expect(customerTransactionCost({ ...base, metadata: { cost_bearer: 'customer' } })).toBe(35)
    expect(customerTransactionCost({ ...base, metadata: { cost_bearer: 'provider' } })).toBe(10)
    expect(customerTransactionCost(base)).toBe(10)
  })
})
