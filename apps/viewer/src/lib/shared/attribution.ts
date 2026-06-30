import { parseLanguageString } from '@allmaps/iiif-inspector'

import {
  isSafeHref,
  parseRichTextValue,
  type RichTextPart
} from '$lib/shared/html.js'
import { getCanonicalCanvas, getCanonicalManifest } from '$lib/shared/iiif.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Manifest as IIIFManifest } from '@allmaps/iiif-parser'

export type AttributionPart = RichTextPart

export type GeoreferencedMapAttributionRow = {
  key: string
  label: string
  organization?: AttributionPart[]
  attribution?: AttributionPart[]
}

export type GeoreferencedMapAttributionGroup = {
  key: string
  label: string
  rows: GeoreferencedMapAttributionRow[]
}

function parseAttributionValue(value: string) {
  return parseRichTextValue(value, { decodeText: true })
}

function parseLabel(label?: Parameters<typeof parseLanguageString>[0]) {
  return parseLanguageString(label, 'en').trim()
}

function getKnownLabel(label?: Parameters<typeof parseLanguageString>[0]) {
  const parsedLabel = parseLabel(label)

  return parsedLabel && parsedLabel !== '-' ? parsedLabel : undefined
}

function getManifestAttribution(manifest?: IIIFManifest) {
  const attribution = parseLabel(manifest?.requiredStatement?.value)

  return attribution ? parseAttributionValue(attribution) : undefined
}

function getOrganizationAttribution(map: GeoreferencedMap) {
  const provider = map.resource.provider?.[0]
  const label = parseLabel(provider?.label)

  const homepage = provider?.homepage?.[0]?.id

  if (label) {
    return [
      homepage && isSafeHref(homepage)
        ? {
            type: 'link' as const,
            label,
            href: homepage
          }
        : {
            type: 'text' as const,
            value: label
          }
    ]
  }

  try {
    const url = new URL(map.resource.id)

    return [
      {
        type: 'link' as const,
        label: url.hostname,
        href: url.origin
      }
    ]
  } catch {
    return
  }
}

function getUnknownAttribution() {
  return [
    {
      type: 'text' as const,
      value: 'Unknown'
    }
  ]
}

function getPartsKey(parts: AttributionPart[] | undefined) {
  if (!parts) {
    return ''
  }

  return parts
    .map((part) => {
      if (part.type === 'link') {
        return `${part.type}:${part.href}:${part.label}`
      }

      if (part.type === 'text') {
        return `${part.type}:${part.value}`
      }

      return part.type
    })
    .join('|')
}

function getImageLabel(index: number) {
  return `Map ${index + 1}`
}

function getCanvasLabel(map: GeoreferencedMap) {
  const canvas = getCanonicalCanvas(map)

  if (canvas) {
    return getKnownLabel(canvas.label) ?? canvas.id
  }
}

function getManifestLabel(map: GeoreferencedMap) {
  const manifest = getCanonicalManifest(map)

  if (manifest) {
    return getKnownLabel(manifest.label) ?? manifest.id
  }
}

function getAttributionScope(map: GeoreferencedMap, index: number) {
  const manifest = getCanonicalManifest(map)

  if (manifest) {
    return {
      key: `manifest:${manifest.id}`,
      label: getManifestLabel(map) ?? manifest.id,
      manifest
    }
  }

  const canvas = getCanonicalCanvas(map)

  if (canvas) {
    return {
      key: `canvas:${canvas.id}`,
      label: getCanvasLabel(map) ?? canvas.id
    }
  }

  return {
    key: `image:${map.resource.id}`,
    label: getImageLabel(index)
  }
}

function getAttributionForScope(
  scope: ReturnType<typeof getAttributionScope>,
  getParsedManifest: (manifestId: string) => IIIFManifest | undefined,
  isManifestLoading: (manifestId: string) => boolean
) {
  const manifestId = scope.manifest?.id

  if (manifestId) {
    const manifest = getParsedManifest(manifestId)
    const manifestAttribution = getManifestAttribution(manifest)

    if (manifestAttribution || isManifestLoading(manifestId)) {
      return manifestAttribution
    }
  }

  return getUnknownAttribution()
}

export function getGeoreferencedMapAttributionGroups(
  maps: GeoreferencedMap[],
  getParsedManifest: (manifestId: string) => IIIFManifest | undefined,
  isManifestLoading: (manifestId: string) => boolean
) {
  const groups = new Map<string, GeoreferencedMapAttributionGroup>()

  maps.forEach((map, index) => {
    const scope = getAttributionScope(map, index)

    if (groups.has(scope.key)) {
      return
    }

    const organization = getOrganizationAttribution(map)
    const attribution = getAttributionForScope(
      scope,
      getParsedManifest,
      isManifestLoading
    )

    if (!organization && !attribution) {
      return
    }

    groups.set(scope.key, {
      key: scope.key,
      label: scope.label,
      rows: [
        {
          key: [
            scope.key,
            scope.label,
            getPartsKey(organization),
            getPartsKey(attribution)
          ].join(':'),
          label: scope.label,
          organization,
          attribution
        }
      ]
    })
  })

  return [...groups.values()]
}
