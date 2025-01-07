import { error } from '@sveltejs/kit'

import organizations from '$lib/shared/organizations.js'

type Params = {
  params: {
    id: string
  }
}

export function load({ params }: Params) {
  const organization = organizations.find(
    (organization) => organization.id === params.id
  )

  if (organization) {
    return organization
  }

  error(404, 'Not found')
}
