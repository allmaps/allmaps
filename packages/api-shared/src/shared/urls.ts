export function makeMapUrl(
  annotationsBaseUrl: string,
  mapId: string,
  versionId?: string
) {
  return `${annotationsBaseUrl}/maps/${mapId}${
    versionId ? `@${versionId}` : ''
  }`
}

export function makeImageUrl(
  annotationsBaseUrl: string,
  imageId: string,
  versionId?: string
) {
  return `${annotationsBaseUrl}/images/${imageId}${
    versionId ? `@${versionId}` : ''
  }`
}

export function makeCanvasUrl(annotationsBaseUrl: string, canvasId: string) {
  return `${annotationsBaseUrl}/canvases/${canvasId}`
}

export function makeManifestUrl(
  annotationsBaseUrl: string,
  manifestId: string
) {
  return `${annotationsBaseUrl}/manifests/${manifestId}`
}

export function makeProjectionUrl(apiBaseUrl: string, projectionId: string) {
  return `${apiBaseUrl}/projections/${projectionId}`
}
