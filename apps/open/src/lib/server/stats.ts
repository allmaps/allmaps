import { findOrganization } from '../organization.ts'

import type { Destination } from '../urls.ts'

type HandoffEvent = {
  website: string
  hostname: string
  resourceHostname: string
  restBaseUrl: string
  destination: Destination
}

export async function recordHandoff({
  website,
  hostname,
  resourceHostname,
  restBaseUrl,
  destination
}: HandoffEvent) {
  const signal = AbortSignal.timeout(2500)
  const organization = await findOrganization(
    restBaseUrl,
    resourceHostname,
    signal
  )
  if (!organization) return

  const response = await fetch('https://stats.allmaps.org/api/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Allmaps Open)'
    },
    body: JSON.stringify({
      type: 'event',
      payload: {
        website,
        hostname,
        url: '/',
        name: 'open-in-allmaps',
        data: { organizationId: organization.id, destination }
      }
    }),
    signal
  })

  if (!response.ok) {
    console.warn('Open in Allmaps analytics request failed', response.status)
  }
}
