import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

export const onRequest = defineRouteMiddleware(({ locals, site, url }) => {
  const { head } = locals.starlightRoute
  const imageUrl = new URL('/social/allmaps-docs.jpg', site).href
  const imageDescription =
    'Allmaps Docs: connected Lynn atlas sheets in pink with green ground control point markers.'
  const title = head.find((entry) => entry.attrs?.property === 'og:title')
    ?.attrs?.content
  const description = head.find(
    (entry) => entry.attrs?.property === 'og:description'
  )?.attrs?.content

  if (url.pathname === '/') {
    const titleTag = head.find((entry) => entry.tag === 'title')
    if (titleTag) titleTag.content = 'Allmaps Docs'
    const typeTag = head.find((entry) => entry.attrs?.property === 'og:type')
    if (typeTag?.attrs) typeTag.attrs.content = 'website'
  }

  head.push(
    { tag: 'meta', attrs: { property: 'og:image', content: imageUrl } },
    {
      tag: 'meta',
      attrs: { property: 'og:image:type', content: 'image/jpeg' }
    },
    { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
    { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
    {
      tag: 'meta',
      attrs: { property: 'og:image:alt', content: imageDescription }
    },
    { tag: 'meta', attrs: { name: 'twitter:image', content: imageUrl } },
    {
      tag: 'meta',
      attrs: { name: 'twitter:image:alt', content: imageDescription }
    },
    { tag: 'meta', attrs: { name: 'twitter:title', content: title } },
    {
      tag: 'meta',
      attrs: { name: 'twitter:description', content: description }
    }
  )

  if (import.meta.env.DEV || site?.hostname !== 'docs.allmaps.org') {
    head.push({
      tag: 'meta',
      attrs: { name: 'robots', content: 'noindex, nofollow' }
    })
  }
})
