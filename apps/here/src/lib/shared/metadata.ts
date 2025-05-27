import { truncate } from '$lib/shared/strings.js'
import {
  findCanvases,
  findManifests,
  labelFromPartOfItem
} from '$lib/shared/iiif.js'
import { organizationNameFromImageServiceDomain } from '$lib/shared/organizations.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

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
    .join(' | ')
}
