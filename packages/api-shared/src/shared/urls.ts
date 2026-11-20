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

export function normalizeDomain(value: string): string | undefined {
  const input = value.trim()

  if (!input) {
    return
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(input)
  let hostname = input

  if (withProtocol) {
    try {
      const url = new URL(input)
      if (
        url.username ||
        url.password ||
        (url.pathname && url.pathname !== '/') ||
        url.search ||
        url.hash ||
        url.port
      ) {
        return
      }
      hostname = url.hostname
    } catch {
      return
    }
  }

  const domain = hostname.toLowerCase()
  if (
    /[/?#@:]/.test(domain) ||
    domain.startsWith('.') ||
    domain.endsWith('.') ||
    domain.includes('..')
  ) {
    return
  }

  const label = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
  const domainRegex = new RegExp(`^(?:${label})(?:\\.(?:${label}))*$`)

  return domainRegex.test(domain) ? domain : undefined
}
