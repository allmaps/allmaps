import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

import { getComponentSections } from './component-sections'

export const onRequest = defineRouteMiddleware(({ locals }) => {
  const route = locals.starlightRoute
  const sections = route.entry.data.sections
  if (!sections) return

  const items = getComponentSections(sections)
  route.headings = items.flatMap((item) => [item, ...item.children])
  if (route.toc) route.toc.items = [route.toc.items[0], ...items]
})
