export type ImageSizeLimits = {
  maxWidth?: number
  maxHeight?: number
  maxArea?: number
}

// IIIF 2 puts limits in profile descriptions; IIIF 3 uses top-level fields.
export function readImageSizeLimits(info: Record<string, unknown>) {
  const limits: ImageSizeLimits = {}
  const profiles = Array.isArray(info.profile) ? info.profile : []
  for (const source of [info, ...profiles]) {
    if (!source || typeof source !== 'object') continue
    for (const key of ['maxWidth', 'maxHeight', 'maxArea'] as const) {
      const value = (source as Record<string, unknown>)[key]
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        limits[key] = Math.min(limits[key] ?? Infinity, value)
      }
    }
  }
  return limits
}

export function getPreviewWidths(
  width: number,
  height: number,
  limits: ImageSizeLimits = {}
) {
  const aspectRatio = width / height
  const maxArea = Math.min(1_000_000, limits.maxArea ?? Infinity)
  const maxHeight = Math.min(1280, height, limits.maxHeight ?? Infinity)
  let maxWidth = Math.floor(
    Math.min(
      1280,
      width,
      limits.maxWidth ?? Infinity,
      maxHeight * aspectRatio,
      Math.sqrt(maxArea * aspectRatio)
    )
  )

  // A server may round the output height up. Keep even that result in bounds.
  while (
    maxWidth > 0 &&
    maxWidth * Math.ceil(maxWidth / aspectRatio) > maxArea
  ) {
    maxWidth--
  }
  if (maxWidth < 1) throw new Error('Image size limits do not allow a preview')

  return [...new Set([320, 480, 640, 960, maxWidth])]
    .filter((candidate) => candidate <= maxWidth)
    .sort((a, b) => a - b)
}

export function createImageSources(
  serviceUrl: string,
  width: number,
  height: number,
  limits: ImageSizeLimits = {}
) {
  const widths = getPreviewWidths(width, height, limits)
  const maxWidth = widths.at(-1)!
  const sources = widths.map((candidate) => ({
    width: candidate,
    url: `${serviceUrl.replace(/\/$/, '')}/full/${candidate},/0/default.jpg`
  }))
  const fallback =
    sources.find((source) => source.width >= 640) ?? sources.at(-1)!

  return {
    imageUrl: fallback.url,
    imageSrcset: sources.map(({ url, width }) => `${url} ${width}w`).join(', '),
    intrinsicWidth: maxWidth,
    intrinsicHeight: Math.ceil((maxWidth * height) / width)
  }
}
