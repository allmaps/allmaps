import { env } from '$env/dynamic/public'
import { openConfig } from '$lib/server/config'
import { parseResourceUrl } from '$lib/urls'

import type { PageServerLoad } from './$types'

export const load: PageServerLoad = ({ url, setHeaders }) => {
  const values = [
    ...url.searchParams.getAll('url'),
    ...url.searchParams.getAll('iiif-content')
  ]
  const resource = parseResourceUrl(values[0] ?? null)
  const invalid =
    values.length > 0 &&
    (!resource ||
      values.some((value) => parseResourceUrl(value)?.href !== resource.href))

  if (values.length > 0) setHeaders({ 'X-Robots-Tag': 'noindex' })

  return {
    resourceUrl: invalid ? null : (resource?.href ?? null),
    invalid,
    autoRedirect: url.searchParams.get('redirect') !== 'false',
    trackHandoffs: Boolean(env.PUBLIC_STATS_WEBSITE_ID),
    ...openConfig()
  }
}
