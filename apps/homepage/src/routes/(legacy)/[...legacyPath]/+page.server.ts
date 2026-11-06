import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
import { error, redirect } from '@sveltejs/kit'
import { getLegacyRedirect, legacyPathnames } from '$lib/legacy-redirects.js'

import type { EntryGenerator, PageServerLoad } from './$types'

export const entries: EntryGenerator = () =>
  legacyPathnames.map((pathname) => ({ legacyPath: pathname.slice(1) }))

export const load: PageServerLoad = ({ url }) => {
  const destination = getLegacyRedirect(url.pathname, PUBLIC_DOCS_BASE_URL)
  if (!destination) error(404, 'Not Found')

  redirect(308, destination)
}
