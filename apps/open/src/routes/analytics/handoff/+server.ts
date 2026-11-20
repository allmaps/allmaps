import { env } from '$env/dynamic/public'
import { error } from '@sveltejs/kit'

import { openConfig } from '$lib/server/config'
import { recordHandoff } from '$lib/server/stats'
import { parseResourceUrl } from '$lib/urls'

import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ url, request, platform }) => {
  const contentType = request.headers.get('content-type')?.split(';')[0]
  if (contentType !== 'application/json') {
    error(415, 'Expected an application/json request.')
  }

  const payload: unknown = await request.json().catch(() => null)
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('resourceHostname' in payload) ||
    typeof payload.resourceHostname !== 'string' ||
    parseResourceUrl('https://' + payload.resourceHostname)?.hostname !==
      payload.resourceHostname ||
    !('destination' in payload) ||
    (payload.destination !== 'viewer' && payload.destination !== 'editor')
  ) {
    error(400, 'Invalid Open in Allmaps handoff event.')
  }

  const website = env.PUBLIC_STATS_WEBSITE_ID
  if (website) {
    const { restBaseUrl } = openConfig()
    const stats = recordHandoff({
      website,
      hostname: url.hostname,
      resourceHostname: payload.resourceHostname,
      restBaseUrl,
      destination: payload.destination
    }).catch(() => {
      console.warn('Open in Allmaps analytics request failed')
    })

    if (platform) platform.ctx.waitUntil(stats)
    else await stats
  }

  return new Response(null, {
    status: 204,
    headers: { 'Cache-Control': 'private, no-store' }
  })
}
