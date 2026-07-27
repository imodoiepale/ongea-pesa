// Single source of truth for the admin allowlist.
//
// Both the admin PAGES (app/admin, app/admin-analytics/*) and the admin API
// routes (app/api/admin/*) MUST gate through this module. They previously
// used two different lists (a hardcoded array in the pages, the ADMIN_EMAILS
// env var in the API routes), so an account could load the dashboard page but
// get 403s from every API call behind it.
//
// Baseline admins ship in code so the two gates can never disagree again;
// the ADMIN_EMAILS env var (comma-separated) extends the list per environment.

const BASE_ADMIN_EMAILS = [
  'ijepale@gmail.com',
  'admin@ongeapesa.com',
  'ongeapesa.kenya@gmail.com',
  'info@nsait.co.ke',
]

export function getAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return [...new Set([...BASE_ADMIN_EMAILS, ...fromEnv])]
}

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && getAdminEmails().includes(email.toLowerCase())
}
