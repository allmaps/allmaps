import { mapsApiBaseUrl } from '$lib/config.js'
import { fetchPartnerOrganization } from '$lib/organization.js'

import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, params }) => ({
  organization: await fetchPartnerOrganization(
    fetch,
    mapsApiBaseUrl,
    params.organizationSlug
  )
})
