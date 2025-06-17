import { truncate } from '$lib/shared/strings.js'
import {
  findCanvases,
  findManifests,
  labelFromPartOfItem
} from '$lib/shared/iiif.js'
import { organizationNameFromImageServiceDomain } from '$lib/shared/organizations.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
})

type Division = {
  amount: number
  name: Intl.RelativeTimeFormatUnit
}

const divisions: Division[] = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
]

export function getMapLabels(map: GeoreferencedMap): string[] {
  const manifests = findManifests(map.resource.partOf)
  const canvases = findCanvases(map.resource.partOf)

  const firstCanvasWithManifestLabel = canvases
    .map((canvas) => ({
      canvas,
      label: labelFromPartOfItem(canvas),
      manifests: findManifests(canvas.partOf)
        .map((manifest) => ({
          manifest,
          label: labelFromPartOfItem(manifest)
        }))
        .filter((manifest) => manifest.label)
    }))
    .find((canvas) => canvas.label && canvas.manifests.length > 0)

  const firstCanvasLabel = canvases
    .map((canvas) => ({
      canvas,
      label: labelFromPartOfItem(canvas)
    }))
    .find((canvas) => canvas.label)

  const firstManifestLabel = manifests
    .map((manifest) => ({
      manifest,
      label: labelFromPartOfItem(manifest)
    }))
    .find((manifest) => manifest.label)

  let labels: string[] = []
  if (firstCanvasWithManifestLabel) {
    const canvasLabel = firstCanvasWithManifestLabel.label
    const manifestLabel = firstCanvasWithManifestLabel.manifests[0].label

    if (canvasLabel && manifestLabel) {
      labels = [canvasLabel, manifestLabel]
    } else if (canvasLabel) {
      labels = [canvasLabel]
    } else if (manifestLabel) {
      labels = [manifestLabel]
    }
  } else if (firstCanvasLabel && firstCanvasLabel.label) {
    labels = [firstCanvasLabel.label]
  } else if (firstManifestLabel && firstManifestLabel.label) {
    labels = [firstManifestLabel.label]
  } else if (map?.resource.id) {
    const imageServiceDomain = new URL(map.resource.id).host
    const organizationName =
      organizationNameFromImageServiceDomain(imageServiceDomain)
    if (organizationName) {
      labels = [`Map from ${organizationName}`]
    } else {
      labels = [`Map from ${imageServiceDomain}`]
    }
  }

  return labels
}

export function formatLabels(labels: string[], maxLength = 64): string {
  return labels
    .map((label) =>
      truncate(label, {
        maxLength: maxLength / labels.length,
        toNearestSpace: true
      })
    )
    .join(' / ')
}

function formatTimeAgo(dateStr?: string) {
  if (!dateStr) {
    return
  }

  const date = new Date(dateStr)

  // From https://blog.webdevsimplified.com/2020-07/relative-time-format/
  let duration = (date.getTime() - new Date().getTime()) / 1000
  for (let i = 0; i <= divisions.length; i++) {
    const division = divisions[i]
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name)
    }
    duration /= division.amount
  }
}

export function getTimeAgo(map: GeoreferencedMap) {
  return formatTimeAgo(map.modified)
}
