import { textResponse } from '../responses.ts'
import type { CorsMode, IiifVersion, ImageComplianceLevel } from '../types.ts'
import type { ImageServiceBehavior } from './image-api.ts'

export const slowResourceDelayMs = 4_000
const tooManyRequestsAfterMs = 20_000

const imageServiceBehaviorStartedAt = new Map<string, number>()

export function parseImageServiceBehavior(
  behavior: string | undefined
): ImageServiceBehavior | undefined {
  if (!behavior) {
    return undefined
  }

  if (
    behavior === 'image-500' ||
    behavior === 'service-500' ||
    behavior === 'slow' ||
    behavior === 'too-many-requests-after-20s'
  ) {
    return behavior
  }

  throw new Error(`Unknown image service behavior: ${behavior}`)
}

export function getCombinedImageServiceBehavior(
  variant: string
): ImageServiceBehavior | undefined {
  if (variant === 'image-500-iiif3-level2') {
    return 'image-500'
  }

  if (variant === 'service-500-iiif3-level2') {
    return 'service-500'
  }

  if (variant === 'slow-iiif3-level2') {
    return 'slow'
  }

  if (variant === 'too-many-requests-after-20s-iiif3-level2') {
    return 'too-many-requests-after-20s'
  }

  return undefined
}

export function isSlowCombinedVariant(variant: string) {
  return getCombinedImageServiceBehavior(variant) === 'slow'
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function delaySlowResource(variantOrBehavior: string | undefined) {
  if (variantOrBehavior === 'slow') {
    await delay(slowResourceDelayMs)
  }
}

function getImageServiceBehaviorKey(
  corsMode: CorsMode,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageId: string,
  behavior: ImageServiceBehavior
) {
  return [corsMode, version, complianceLevel, imageId, behavior].join(':')
}

export function shouldReturnTooManyRequests(
  corsMode: CorsMode,
  version: IiifVersion,
  complianceLevel: ImageComplianceLevel,
  imageId: string,
  behavior: ImageServiceBehavior | undefined
) {
  if (behavior !== 'too-many-requests-after-20s') {
    return false
  }

  const key = getImageServiceBehaviorKey(
    corsMode,
    version,
    complianceLevel,
    imageId,
    behavior
  )
  const now = Date.now()
  const startedAt = imageServiceBehaviorStartedAt.get(key) ?? now

  if (!imageServiceBehaviorStartedAt.has(key)) {
    imageServiceBehaviorStartedAt.set(key, startedAt)
  }

  return now - startedAt >= tooManyRequestsAfterMs
}

export function tooManyRequestsResponse(corsMode: CorsMode) {
  const response = textResponse('Too Many Requests', corsMode, 429)
  response.headers.set('retry-after', '20')

  return response
}
