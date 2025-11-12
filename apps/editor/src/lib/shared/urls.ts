export function getApiUrl(apiBaseUrl: string, allmapsId: string) {
  return `${apiBaseUrl}/${allmapsId}`
}

export function getAnnotationUrl(
  annotationsApiBaseUrl: string,
  allmapsId: string
) {
  return `${annotationsApiBaseUrl}/${allmapsId}`
}

export function getViewerUrl(
  viewerBaseUrl: string,
  annotationsApiBaseUrl: string,
  allmapsId: string,
  isFullMapId = false
) {
  return `${viewerBaseUrl}/?url=${isFullMapId ? allmapsId : getAnnotationUrl(annotationsApiBaseUrl, allmapsId)}`
}

export function getGeoJsonUrl(
  annotationsApiBaseUrl: string,
  allmapsId: string
) {
  return `${getAnnotationUrl(annotationsApiBaseUrl, allmapsId)}.geojson`
}

export function getXyzTilesUrl(
  tileServerBaseUrl: string,
  allmapsId: string,
  retinaTiles = true
) {
  return `${tileServerBaseUrl}/${allmapsId}/{z}/{x}/{y}${retinaTiles ? '@2x' : ''}.png`
}
