import { expect, test } from "@playwright/test"
import { stat } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import { orbitalScreenScenes } from "../components/foundation/orbital-screen-scenes"

const scenes = ["auth", "voice", "transfer", "wallet", "scanner", "chama", "escrow", "planning", "trust"] as const

test("all 35 product states have an artwork family", () => {
  expect(Object.keys(orbitalScreenScenes)).toHaveLength(35)
  expect(new Set(Object.values(orbitalScreenScenes))).toEqual(new Set(scenes))
})

for (const scene of scenes) {
  for (const theme of ["light", "dark"] as const) {
    test(`${scene} ${theme} plate is optimized and exactly 9:16`, async () => {
      for (const extension of ["avif", "webp"] as const) {
        const file = path.join(process.cwd(), "public", "brand", "orbital", "backgrounds", `${scene}-${theme}.${extension}`)
        const [metadata, details] = await Promise.all([sharp(file).metadata(), stat(file)])
        expect(metadata.width).toBe(1080)
        expect(metadata.height).toBe(1920)
        expect(details.size).toBeLessThan(250 * 1024)
      }
    })
  }
}
