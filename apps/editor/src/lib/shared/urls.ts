import {
  PUBLIC_ALLMAPS_API_URL,
  PUBLIC_ALLMAPS_ANNOTATIONS_API_URL,
  PUBLIC_ALLMAPS_VIEWER_URL,
  PUBLIC_ALLMAPS_TILE_SERVER_URL
} from '$env/static/public'

export function getApiUrl(allmapsId: string) {
  return `${PUBLIC_ALLMAPS_API_URL}/${allmapsId}`
}

export function getAnnotationUrl(allmapsId: string) {
  return `${PUBLIC_ALLMAPS_ANNOTATIONS_API_URL}/${allmapsId}`
}

export function getViewerUrl(allmapsId: string) {
  return `${PUBLIC_ALLMAPS_VIEWER_URL}/?url=${getAnnotationUrl(allmapsId)}`
}

export function getGeoJsonUrl(allmapsId: string) {
  return `${getAnnotationUrl(allmapsId)}.geojson`
}

export function getXyzTilesUrl(allmapsId: string, retinaTiles = true) {
  return `${PUBLIC_ALLMAPS_TILE_SERVER_URL}/${allmapsId}/{z}/{x}/{y}${retinaTiles ? '@2x' : ''}.png`
}
