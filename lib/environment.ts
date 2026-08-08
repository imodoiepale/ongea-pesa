/**
 * Which environment this deployment writes money records as.
 *
 * The default is 'live', deliberately. The tempting default is 'test' — it
 * looks safer — but it is not: a production deploy that loses its env var would
 * then silently record real customer money as test data, and it would be
 * invisible, because the revenue dashboards filter to live. Under-reporting
 * real money is a worse failure than over-reporting sandbox money, which is
 * obvious the moment anyone looks at it.
 *
 * Set ONGEA_ENVIRONMENT=test on preview deployments and local dev.
 */
export type OngeaEnvironment = 'test' | 'live'

export const ONGEA_ENV: OngeaEnvironment =
  process.env.ONGEA_ENVIRONMENT === 'test' ? 'test' : 'live'

export const IS_TEST_ENV = ONGEA_ENV === 'test'
