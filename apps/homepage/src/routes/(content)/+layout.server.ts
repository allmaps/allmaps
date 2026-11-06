import { error } from '@sveltejs/kit'

import {
  normalizeContentPageMetadata,
  type ContentPageModule
} from '$lib/content/pages.js'

import type { LayoutServerLoad } from './$types'

const contentPageModules = import.meta.glob<ContentPageModule>(
  './*/+page.svx',
  {
    eager: true
  }
)

export const load: LayoutServerLoad = ({ url }) => {
  const routeSegment = url.pathname.split('/').filter(Boolean)[0]
  const contentPageModule = contentPageModules[`./${routeSegment}/+page.svx`]

  if (!contentPageModule) {
    error(404, 'Content page not found')
  }

  return {
    metadata: normalizeContentPageMetadata(contentPageModule)
  }
}
