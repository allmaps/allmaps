import { generateRandomId } from '$lib/shared/id.js'

import type { TerraDraw } from 'terra-draw'

export const idStrategy = {
  isValidId: (id: unknown) => typeof id === 'string' && id.length === 16,
  getId: () => generateRandomId()
}

export function ensureStringId(id: string | number | undefined): string {
  if (typeof id === 'string') {
    return id
  }

  throw new Error('ID is not a string')
}

export function clearFeatures(draw?: TerraDraw, mode?: string) {
  if (draw) {
    draw.getSnapshot().forEach((feature) => {
      if (feature.id) {
        if (!mode || (mode && feature.properties?.mode === mode)) {
          if (draw.getSnapshotFeature(feature.id)) {
            draw.removeFeatures([feature.id])
          }
        }
      }
    })
  }
}
