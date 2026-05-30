import { sourceFromUrl } from '$lib/shared/source.js'

import type { LayoutServerLoad } from './$types'

const FETCH_TIMEOUT_MS = 2000

export const load: LayoutServerLoad = async ({ fetch, url, parent }) => {
  const { env } = await parent()

  const urlParam = url.searchParams.get('url')

  const fetchWithTimeout: typeof fetch = (input, init) =>
    fetch(input, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), ...init })

  if (urlParam) {
    try {
      const source = await sourceFromUrl(
        env.PUBLIC_REST_BASE_URL,
        urlParam,
        fetchWithTimeout
      )

      return {
        source,
        urlParam
      }
    } catch {
      // An error occurred while fetching the source.
      // This probably means the URL is invalid or unvailable, but it
      // could also mean the host institution is blocking traffic from
      // our server on Cloudflare because it thinks it's an AI bot.
      // We should try again in the browser!

      return {
        urlParam
      }
    }
  }
}
