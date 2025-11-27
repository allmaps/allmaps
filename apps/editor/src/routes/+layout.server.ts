import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ platform }) => {
  if (!platform) {
    throw new Error('No platform env variable found')
  }

  return {
    vars: {
      PUBLIC_ALLMAPS_API_WS_URL: platform.env.PUBLIC_ALLMAPS_API_WS_URL,
      PUBLIC_ALLMAPS_API_URL: platform.env.PUBLIC_ALLMAPS_API_URL,
      PUBLIC_ALLMAPS_ANNOTATIONS_API_URL:
        platform.env.PUBLIC_ALLMAPS_ANNOTATIONS_API_URL,
      PUBLIC_ALLMAPS_PREVIEW_URL: platform.env.PUBLIC_ALLMAPS_PREVIEW_URL,
      PUBLIC_ALLMAPS_VIEWER_URL: platform.env.PUBLIC_ALLMAPS_VIEWER_URL,
      PUBLIC_ALLMAPS_TILE_SERVER_URL:
        platform.env.PUBLIC_ALLMAPS_TILE_SERVER_URL,
      PUBLIC_EXAMPLES_API_URL: platform.env.PUBLIC_EXAMPLES_API_URL,
      PUBLIC_STATS_WEBSITE_ID: platform.env.PUBLIC_STATS_WEBSITE_ID,
      VITE_BANNER_ENABLED: platform.env.VITE_BANNER_ENABLED,
      VITE_BANNER_TEXT: platform.env.VITE_BANNER_TEXT,
      PUBLIC_GEOCODE_EARTH_KEY: platform.env.PUBLIC_GEOCODE_EARTH_KEY
    }
  }
}
