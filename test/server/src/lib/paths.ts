import type {
  CorsMode,
  IiifVersion,
  ImageComplianceLevel,
  JsonObject
} from './types.ts'

export function getBaseUrl(request: Request, corsMode: CorsMode) {
  const url = new URL(request.url)

  return `${url.origin}/${corsMode}`
}

export function getImageServiceId(
  request: Request,
  corsMode: CorsMode,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageId: string,
  suffix?: string
) {
  return `${getBaseUrl(request, corsMode)}/iiif/${version}/${complianceLevel}/${imageId}${suffix ? `/${suffix}` : ''}`
}

export function parseCorsMode(corsMode: string): CorsMode {
  if (corsMode === 'cors' || corsMode === 'no-cors') {
    return corsMode
  }

  throw new Error('Use /cors or /no-cors')
}

export function parseIiifVersion(version: string): IiifVersion {
  if (version === '2' || version === '3') {
    return version
  }

  throw new Error('IIIF version must be 2 or 3')
}

export function parseImageComplianceLevel(
  complianceLevel: string
): ImageComplianceLevel {
  if (
    complianceLevel === 'level0' ||
    complianceLevel === 'level1' ||
    complianceLevel === 'level2'
  ) {
    return complianceLevel
  }

  throw new Error(
    'IIIF image compliance level must be level0, level1, or level2'
  )
}

export function cloneJsonObject(value: unknown): JsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return structuredClone(value) as JsonObject
  }

  return {}
}

export function localizeFixtureUrls(value: unknown, baseUrl: string): unknown {
  if (typeof value === 'string') {
    const localized = value.replace(
      /^http:\/\/localhost:5506\/(?:cors|no-cors)/,
      baseUrl
    )

    return localized.replace(
      /^(https?:\/\/[^/]+\/(?:cors|no-cors)\/iiif\/[23])\/(?!level[012]\/)/,
      '$1/level1/'
    )
  }

  if (Array.isArray(value)) {
    return value.map((item) => localizeFixtureUrls(item, baseUrl))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        localizeFixtureUrls(item, baseUrl)
      ])
    )
  }

  return value
}

export function parseJsonFilename(path: string) {
  const match = path.match(/^([^/]+)\.json$/)

  if (!match) {
    throw new Error(`Expected JSON filename, got: ${path}`)
  }

  return match[1]
}

export function parseVariantJsonFilename(path: string) {
  const match = path.match(/^([^/]+)\/([^/]+)\.json$/)

  if (!match) {
    throw new Error(`Expected variant JSON filename, got: ${path}`)
  }

  return {
    imageId: match[1],
    variant: match[2]
  }
}

export function parsePath(path: string) {
  return path.split('/').filter((segment) => segment.length > 0)
}
