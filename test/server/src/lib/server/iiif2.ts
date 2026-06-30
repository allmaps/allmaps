function isJsonObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function getIiif2Label(value: unknown, fallback: string): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  if (Array.isArray(value)) {
    const firstLabel = value
      .map((item) => getIiif2Label(item, ''))
      .find((item) => item.length > 0)

    return firstLabel ?? fallback
  }

  if (isJsonObject(value)) {
    if ('@value' in value) {
      return getIiif2Label(value['@value'], fallback)
    }

    if ('value' in value) {
      return getIiif2Label(value.value, fallback)
    }

    for (const item of Object.values(value)) {
      const label = getIiif2Label(item, '')

      if (label.length > 0) {
        return label
      }
    }
  }

  return fallback
}

export function getIiif2Rendering(value: unknown) {
  const resources = Array.isArray(value) ? value : value ? [value] : []
  const rendering = resources.flatMap((resource) => {
    if (!isJsonObject(resource)) {
      return []
    }

    const id = resource['@id'] ?? resource.id

    if (typeof id !== 'string') {
      return []
    }

    return [
      {
        '@id': id,
        ...(typeof (resource['@type'] ?? resource.type) === 'string'
          ? { '@type': resource['@type'] ?? resource.type }
          : {}),
        label: getIiif2Label(resource.label, 'Rendering'),
        ...(typeof resource.format === 'string'
          ? { format: resource.format }
          : {})
      }
    ]
  })

  return rendering.length > 0 ? rendering : undefined
}

export function getIiif2Thumbnail(value: unknown) {
  type Iiif2Thumbnail =
    | string
    | {
        '@id': string
        '@type'?: unknown
        format?: string
        height?: number
        width?: number
      }

  const resources = Array.isArray(value) ? value : value ? [value] : []
  const thumbnails: Iiif2Thumbnail[] = []

  for (const resource of resources) {
    if (typeof resource === 'string') {
      thumbnails.push(resource)
      continue
    }

    if (!isJsonObject(resource)) {
      continue
    }

    const id = resource['@id'] ?? resource.id

    if (typeof id !== 'string') {
      continue
    }

    thumbnails.push({
      '@id': id,
      ...(typeof (resource['@type'] ?? resource.type) === 'string'
        ? { '@type': resource['@type'] ?? resource.type }
        : {}),
      ...(typeof resource.format === 'string'
        ? { format: resource.format }
        : {}),
      ...(typeof resource.height === 'number'
        ? { height: resource.height }
        : {}),
      ...(typeof resource.width === 'number' ? { width: resource.width } : {})
    })
  }

  return thumbnails.length > 0 ? thumbnails : undefined
}
