import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

import { backgroundStorageKey } from './starlight/components/playground-backgrounds'
import { getComponentSections } from './component-sections'

export const onRequest = defineRouteMiddleware(({ locals }) => {
  const route = locals.starlightRoute
  const sections = route.entry.data.sections
  if (!sections) return

  route.head.push(
    {
      tag: 'script',
      content: `try {
      const background = localStorage.getItem(${JSON.stringify(backgroundStorageKey)})
      if (background) document.documentElement.dataset.playgroundBackground = background
    } catch {}`
    },
    {
      tag: 'link',
      attrs: {
        rel: 'stylesheet',
        href: `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ui-sdk-preview.css`
      }
    }
  )

  const items = getComponentSections(sections)
  route.headings = items.flatMap((item) => [item, ...item.children])
  if (route.toc) route.toc.items = [route.toc.items[0], ...items]
})
