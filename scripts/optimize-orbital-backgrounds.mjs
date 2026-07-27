import { mkdir, readdir } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const root = process.cwd()
const sourceDirectory = path.join(root, "brand", "generated", "orbital-backgrounds", "source")
const outputDirectory = path.join(root, "public", "brand", "orbital", "backgrounds")

await mkdir(outputDirectory, { recursive: true })

const sources = (await readdir(sourceDirectory))
  .filter((file) => file.endsWith(".png"))
  .sort()

if (sources.length !== 18) {
  throw new Error(`Expected 18 source plates, found ${sources.length}.`)
}

for (const source of sources) {
  const basename = path.basename(source, ".png")
  const pipeline = sharp(path.join(sourceDirectory, source))
    .rotate()
    .resize(1080, 1920, {
      fit: "cover",
      position: "centre",
      withoutEnlargement: false,
    })
    .withMetadata({ density: 72, orientation: 1 })

  await Promise.all([
    pipeline
      .clone()
      .avif({ quality: 58, effort: 6, chromaSubsampling: "4:4:4" })
      .toFile(path.join(outputDirectory, `${basename}.avif`)),
    pipeline
      .clone()
      .webp({ quality: 84, effort: 6, smartSubsample: true })
      .toFile(path.join(outputDirectory, `${basename}.webp`)),
  ])
}

const outputs = await readdir(outputDirectory)
console.log(`Optimized ${sources.length} portrait plates into ${outputs.length} runtime assets.`)
