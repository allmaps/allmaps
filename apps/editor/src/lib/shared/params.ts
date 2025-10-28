import { getUrlState as getGenericUrlState } from '$lib/state/url.svelte.js'

import type { Bbox } from '@allmaps/types'

import type { CollectionPath, SearchParam } from '$lib/types/shared.js'

export const searchParams = {
  url: {
    key: 'url'
  },
  manifestId: {
    key: 'manifest'
  },
  imageId: {
    key: 'image'
  },
  mapId: {
    key: 'map'
  },
  bbox: {
    key: 'bbox',
    toString: (value?: Bbox) =>
      value ? value.map((num) => num.toFixed(6)).join(',') : undefined,
    parse: (value?: string) => {
      if (value) {
        const bbox = value
          .split(',')
          .map((v) => parseFloat(v))
          .filter((v) => Number.isFinite(v))

        if (bbox.length === 4) {
          return bbox as Bbox
        }
      }
    }
  },
  path: {
    key: 'path',
    default: [] as CollectionPath,
    toString: (value: CollectionPath) =>
      value && value.length > 0
        ? value
            .map(({ index, page }) => (page ? `${index}.${page}` : `${index}`))
            .join('-')
        : undefined,
    parse: (value?: string): CollectionPath | undefined => {
      if (value) {
        return value.split('-').flatMap((part: string) => {
          if (part) {
            const [index, page] = part.split('.').map((v) => parseInt(v))
            if (Number.isFinite(index) && Number.isFinite(page)) {
              return { index, page }
            } else if (Number.isFinite(index)) {
              return { index }
            } else {
              return []
            }
          } else {
            return []
          }
        })
      } else {
        return []
      }
    }
  } satisfies SearchParam<CollectionPath>,
  callback: {
    key: 'callback'
  },
  basemapXyzUrl: {
    key: 'bg-url'
  },
  basemapPresetId: {
    key: 'bg-preset'
  },
  backgroundGeoreferenceAnnotationUrl: {
    key: 'bg-annotation-url'
  }
} // as const

/**
 * Get the URL state with properly typed search params.
 * This is a convenience wrapper around getUrlState() that automatically
 * provides the correct type for this app's search parameters.
 */
export function getUrlState() {
  return getGenericUrlState<typeof searchParams>()
}
