import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const root = process.cwd()
const transparentSource = path.join(
  root,
  "brand",
  "generated",
  "logos",
  "source",
  "ongea-pesa-4k-transparent-base.png",
)
const logoDirectory = path.join(root, "public", "brand", "logos")
const iconDirectory = path.join(root, "public", "icons")

await mkdir(logoDirectory, { recursive: true })
await mkdir(iconDirectory, { recursive: true })

const source = await readFile(transparentSource)
const metadata = await sharp(source).metadata()
if (!metadata.width || !metadata.height || !metadata.hasAlpha) {
  throw new Error("The generated logo source must be a transparent raster image.")
}

const tightWidth = 3840
const tightHeight = Math.round((metadata.height / metadata.width) * tightWidth)
const tight4k = await sharp(source)
  .resize(tightWidth, tightHeight, {
    fit: "fill",
    kernel: sharp.kernel.lanczos3,
  })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()

await Promise.all([
  writeFile(path.join(logoDirectory, "ongea-pesa-logo-4k.png"), tight4k),
  sharp(tight4k)
    .webp({ quality: 96, alphaQuality: 100, effort: 6 })
    .toFile(path.join(logoDirectory, "ongea-pesa-logo-4k.webp")),
  sharp({
    create: {
      width: 3840,
      height: 2160,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: tight4k, top: Math.floor((2160 - tightHeight) / 2), left: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(logoDirectory, "ongea-pesa-logo-uhd-3840x2160.png")),
  sharp(source)
    .resize(1600, null, { kernel: sharp.kernel.lanczos3 })
    .webp({ quality: 92, alphaQuality: 100, effort: 6 })
    .toFile(path.join(logoDirectory, "ongea-pesa-logo.webp")),
  sharp(source)
    .resize(1600, null, { kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(logoDirectory, "ongea-pesa-logo.png")),
])

const [runtimePng, runtimeWebp] = await Promise.all([
  readFile(path.join(logoDirectory, "ongea-pesa-logo.png")),
  readFile(path.join(logoDirectory, "ongea-pesa-logo.webp")),
])
await Promise.all([
  writeFile(path.join(logoDirectory, "ongea-pesa-horizontal-dark.png"), runtimePng),
  writeFile(path.join(logoDirectory, "ongea-pesa-horizontal-light.png"), runtimePng),
  writeFile(path.join(logoDirectory, "ongea-pesa-horizontal-dark.webp"), runtimeWebp),
  writeFile(path.join(logoDirectory, "ongea-pesa-horizontal-light.webp"), runtimeWebp),
])

const emblem = await sharp(source)
  .extract({
    left: 0,
    top: 0,
    width: Math.min(metadata.height, metadata.width),
    height: metadata.height,
  })
  .resize(1024, 1024, { fit: "contain", kernel: sharp.kernel.lanczos3 })
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toBuffer()

await writeFile(path.join(logoDirectory, "orb-emblem.png"), emblem)

const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512]
for (const size of iconSizes) {
  const icon = await sharp(emblem)
    .resize(size, size, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()

  await writeFile(path.join(logoDirectory, `ongea-pesa-icon-${size}.png`), icon)
  await writeFile(path.join(iconDirectory, `icon-${size}x${size}.png`), icon)
  if (size === 16 || size === 32) {
    await writeFile(path.join(iconDirectory, `favicon-${size}x${size}.png`), icon)
  }
}

console.log(
  `Exported transparent Ongea Pesa logo masters at ${tightWidth}x${tightHeight} and 3840x2160.`,
)
