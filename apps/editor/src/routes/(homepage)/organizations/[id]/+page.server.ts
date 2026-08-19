import { error } from '@sveltejs/kit'

import {
  fetchExampleOrganizationBySlug,
  fetchUngeoreferencedImages,
  imagesToExamples,
  ORGANIZATION_EXAMPLES_COUNT,
  shuffleImages
} from '$lib/shared/examples.js'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ fetch, params, parent }) => {
  const { env } = await parent()
  const organization = await fetchExampleOrganizationBySlug(
    fetch,
    env.PUBLIC_REST_BASE_URL,
    params.id
  )

  if (!organization) {
    error(404, 'Not found')
  }

  const images = await fetchUngeoreferencedImages(
    fetch,
    organization,
    ORGANIZATION_EXAMPLES_COUNT
  )

  return {
    organization,
    examples: imagesToExamples(organization, shuffleImages(images))
  }
}
