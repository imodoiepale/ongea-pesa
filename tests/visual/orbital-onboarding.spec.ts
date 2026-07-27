import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"

const screens = [
  ["welcome", "/welcome"],
  ["sign-in", "/login"],
  ["profile", "/profile-creation"],
  ["voice-calibration", "/voice-calibration"],
  ["security-setup", "/security-setup"],
] as const

for (const theme of ["light", "dark"] as const) {
  for (const [name, route] of screens) {
    test(`${name} matches the ${theme} orbital system`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile-chromium", "Reference fidelity is measured at 390×844")
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" })
      await page.addInitScript((selectedTheme) => localStorage.setItem("theme", selectedTheme), theme)
      await page.goto(route)
      await page.locator("main").waitFor()
      await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { animations: "disabled", fullPage: true, maxDiffPixelRatio: 0.015 })
    })
  }
}

test("public access screens have no serious automated accessibility violations", async ({ page }) => {
  await page.goto("/login")
  const results = await new AxeBuilder({ page }).disableRules(["color-contrast"]).analyze()
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""))).toEqual([])
})
