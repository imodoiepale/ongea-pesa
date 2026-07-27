import { expect, test } from "@playwright/test"

const protectedRoutes = ["/", "/voice", "/wallet", "/transactions", "/scanner", "/chama", "/escrow", "/batch", "/scheduler", "/analytics", "/payments", "/settings", "/support"]

for (const route of protectedRoutes) {
  test(`${route} requires a session`, async ({ page }) => {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login|\/welcome|\/signup/)
  })
}
