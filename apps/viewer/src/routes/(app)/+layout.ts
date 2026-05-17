import { error } from '@sveltejs/kit'

import { sourceFromUrl } from '$lib/shared/source.js'

import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ fetch, url }) => {
  const urlParam = url.searchParams.get('url')

  if (urlParam) {
    try {
      const source = await sourceFromUrl(urlParam, fetch)

      return {
        source
      }
    } catch (err) {
      let message = 'Failed to load source'
      if (err instanceof Error) {
        message = err.message
      }

      error(500, {
        message
      })
    }
  }
}
