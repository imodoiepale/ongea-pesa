const MAX_SOURCE_BYTES = 30 * 1024 * 1024
const AVATAR_EDGE = 768
const TARGET_BYTES = 1.5 * 1024 * 1024
const HEIC_TYPES = new Set(["image/heic", "image/heif", "image/heic-sequence", "image/heif-sequence"])

export type OptimizedProfileImage = {
  file: File
  width: number
  height: number
  originalBytes: number
  optimizedBytes: number
}

function loadWithImageElement(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(sourceUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl)
      reject(new Error("This photo format could not be opened. Try a JPG, PNG, WebP, AVIF or HEIC photo."))
    }
    image.src = sourceUrl
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))
}

function hasHeicExtension(file: File) {
  return /\.(?:heic|heif)$/i.test(file.name)
}

async function normalizeProfileSource(file: File) {
  if (!HEIC_TYPES.has(file.type.toLowerCase()) && !hasHeicExtension(file)) return file

  try {
    const { heicTo } = await import("heic-to/next")
    const converted = await heicTo({
      blob: file,
      type: "image/jpeg",
      quality: 0.92,
    })

    return new File([converted], file.name.replace(/\.(?:heic|heif)$/i, ".jpg"), {
      type: "image/jpeg",
      lastModified: file.lastModified,
    })
  } catch {
    throw new Error("We couldn't open that HEIC photo. Try selecting it again or choose a JPEG, PNG, WebP or AVIF image.")
  }
}

export async function optimizeProfileImage(file: File): Promise<OptimizedProfileImage> {
  if (!file.type.startsWith("image/") && !hasHeicExtension(file)) {
    throw new Error("Choose a photo from your device.")
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("That photo is unusually large. Choose one under 30 MB and we'll optimize it for you.")
  }

  const normalizedFile = await normalizeProfileSource(file)
  let source: ImageBitmap | HTMLImageElement
  try {
    source = "createImageBitmap" in window
      ? await createImageBitmap(normalizedFile, { imageOrientation: "from-image" })
      : await loadWithImageElement(normalizedFile)
  } catch {
    source = await loadWithImageElement(normalizedFile)
  }

  const sourceWidth = source instanceof ImageBitmap ? source.width : source.naturalWidth
  const sourceHeight = source instanceof ImageBitmap ? source.height : source.naturalHeight
  const cropSize = Math.min(sourceWidth, sourceHeight)
  const cropX = Math.max(0, (sourceWidth - cropSize) / 2)
  const cropY = Math.max(0, (sourceHeight - cropSize) / 2)

  const canvas = document.createElement("canvas")
  canvas.width = AVATAR_EDGE
  canvas.height = AVATAR_EDGE
  const context = canvas.getContext("2d", { alpha: false })
  if (!context) {
    if (source instanceof ImageBitmap) source.close()
    throw new Error("Your browser could not prepare this photo. Please try another one.")
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = "high"
  context.fillStyle = "#08272a"
  context.fillRect(0, 0, AVATAR_EDGE, AVATAR_EDGE)
  context.drawImage(source, cropX, cropY, cropSize, cropSize, 0, 0, AVATAR_EDGE, AVATAR_EDGE)
  if (source instanceof ImageBitmap) source.close()

  let output: Blob | null = null
  let quality = 0.86
  while (quality >= 0.62) {
    output = await canvasToBlob(canvas, "image/webp", quality)
    if (output && output.size <= TARGET_BYTES) break
    quality -= 0.08
  }

  if (!output) output = await canvasToBlob(canvas, "image/jpeg", 0.82)
  if (!output || output.size > 2 * 1024 * 1024) {
    throw new Error("We couldn't make this photo small enough. Please try a different photo.")
  }

  const extension = output.type === "image/webp" ? "webp" : "jpg"
  return {
    file: new File([output], `profile.${extension}`, {
      type: output.type,
      lastModified: Date.now(),
    }),
    width: AVATAR_EDGE,
    height: AVATAR_EDGE,
    originalBytes: file.size,
    optimizedBytes: output.size,
  }
}

export function formatImageSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
