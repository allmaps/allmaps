import type { Point } from '@allmaps/types'

export function getAllmapsId(url: string) {
  const match = url.match(/\/(maps\/[0-9a-f]{16}(?:@[0-9a-f]{16})?)/)
  return match ? match[1] : undefined
}

export function getHerePreviewUrl(
  previewBaseUrl: string,
  mapId: string,
  from: Point
) {
  return `${previewBaseUrl}/apps/here/${getAllmapsId(mapId)}.jpg?from=${from.join(',')}`
}
