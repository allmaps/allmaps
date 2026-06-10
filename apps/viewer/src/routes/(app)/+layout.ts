import { error } from '@sveltejs/kit'

import { sourceFromUrl } from '$lib/shared/source.js'

import type { LayoutLoad } from './$types'

export const load: LayoutLoad = async ({ data, fetch, url, parent }) => {
  const { env } = await parent()
  const source = data?.source

  const urlParam = url.searchParams.get('url')

  if (source || !urlParam) {
    return {
      source,
      urlParam
    }
  }

  if (urlParam) {
    try {
      const fallbackSource = await sourceFromUrl(
        env.PUBLIC_REST_BASE_URL,
        urlParam,
        fetch
      )

      return {
        source: fallbackSource,
        urlParam
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

  return {
    urlParam
  }
}
