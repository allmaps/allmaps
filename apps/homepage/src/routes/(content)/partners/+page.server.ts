import { partnerPreviews } from '$lib/data/partner-previews.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => ({ partnerPreviews })
