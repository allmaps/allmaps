import { getUrlState as getGenericUrlState } from '$lib/state/url.svelte.js'

export const searchParams = {
  url: {
    key: 'url'
  },
  data: {
    key: 'data',
    hash: true,
    toString: (value?: unknown) => (value ? JSON.stringify(value) : undefined),
    parse: (value?: string) => {
      if (value) {
        try {
          return JSON.parse(value)
        } catch {
          return undefined
        }
      }
    }
  },
  imageId: {
    key: 'image'
  },
  mapId: {
    key: 'map'
  }
} as const

/**
 * Get the URL state with properly typed search params.
 * This is a convenience wrapper around getUrlState() that automatically
 * provides the correct type for this app's search parameters.
 */
export function getUrlState() {
  return getGenericUrlState<typeof searchParams>()
}
