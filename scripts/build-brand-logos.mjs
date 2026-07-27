import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"

const root = process.cwd()
const logoDirectory = path.join(root, "public", "brand", "logos")
const iconDirectory = path.join(root, "public", "icons")
const emblemPath = path.join(logoDirectory, "orb-emblem.png")
const emblem = await readFile(emblemPath)
const emblemData = `data:image/png;base64,${emblem.toString("base64")}`

await mkdir(logoDirectory, { recursive: true })

const palette = {
  dark: { word: "#06395f", sub: "#075176" },
  light: { word: "#f7fbff", sub: "#bfeaf4" },
}

function horizontal(theme) {
  const color = palette[theme]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="460" viewBox="0 0 1600 460">
  <image href="${emblemData}" x="0" y="0" width="460" height="460" preserveAspectRatio="xMidYMid meet"/>
  <g font-family="Bahnschrift, Eurostile, Arial, sans-serif">
    <text x="442" y="244" fill="${color.word}" font-size="176" font-weight="600" letter-spacing="7">ONGEA PESA</text>
    <path d="M1021 203 L1047 156 L1073 203 Z" fill="#16d8bb"/>
    <text x="742" y="337" fill="${color.sub}" font-size="54" font-weight="600" letter-spacing="30">BY NSAIT</text>
  </g>
</svg>`
}

function stacked(theme) {
  const color = palette[theme]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
  <image href="${emblemData}" x="190" y="8" width="520" height="520" preserveAspectRatio="xMidYMid meet"/>
  <g font-family="Bahnschrift, Eurostile, Arial, sans-serif" text-anchor="middle">
    <text x="450" y="644" fill="${color.word}" font-size="112" font-weight="600" letter-spacing="4">ONGEA PESA</text>
    <path d="M594 618 L610 590 L626 618 Z" fill="#16d8bb"/>
    <text x="450" y="728" fill="${color.sub}" font-size="38" font-weight="600" letter-spacing="22">BY NSAIT</text>
  </g>
</svg>`
}

function wordmark(theme) {
  const color = palette[theme]
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="300" viewBox="0 0 1240 300">
  <g font-family="Bahnschrift, Eurostile, Arial, sans-serif">
    <text x="18" y="166" fill="${color.word}" font-size="150" font-weight="600" letter-spacing="7">ONGEA PESA</text>
    <path d="M751 132 L773 92 L795 132 Z" fill="#16d8bb"/>
    <text x="410" y="253" fill="${color.sub}" font-size="46" font-weight="600" letter-spacing="28">BY NSAIT</text>
  </g>
</svg>`
}

for (const theme of ["dark", "light"]) {
  for (const [name, svg] of [
    ["horizontal", horizontal(theme)],
    ["stacked", stacked(theme)],
    ["wordmark", wordmark(theme)],
  ]) {
    const base = `ongea-pesa-${name}-${theme}`
    await writeFile(path.join(logoDirectory, `${base}.svg`), svg)
    await Promise.all([
      sharp(Buffer.from(svg)).png().toFile(path.join(logoDirectory, `${base}.png`)),
      sharp(Buffer.from(svg)).webp({ quality: 92, effort: 6 }).toFile(path.join(logoDirectory, `${base}.webp`)),
    ])
  }
}

const iconSizes = [16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512]
for (const size of iconSizes) {
  const output = await sharp(emblem)
    .resize(size, size, { fit: "contain" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
  await writeFile(path.join(logoDirectory, `ongea-pesa-icon-${size}.png`), output)
  if ([16, 32, 48, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512].includes(size)) {
    await writeFile(path.join(iconDirectory, `icon-${size}x${size}.png`), output)
  }
  if (size === 16 || size === 32) {
    await writeFile(path.join(iconDirectory, `favicon-${size}x${size}.png`), output)
  }
}

console.log("Built transparent Ongea Pesa logo family and app icons.")
