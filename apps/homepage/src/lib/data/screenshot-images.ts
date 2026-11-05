import assets from './image-assets.json'

type ResponsiveImage = {
  src: string
  srcset: string
}

function getResponsiveImage(
  category: 'screenshots' | 'examples',
  slug: string
): ResponsiveImage {
  const images = Object.entries(assets)
    .filter(([name]) => name.startsWith(`${category}/${slug}-`))
    .filter(([name]) =>
      /^\d+\.webp$/.test(name.slice(`${category}/${slug}-`.length))
    )
    .map(([, asset]) => asset)
    .sort((left, right) => left.width - right.width)
  if (!images.length) throw new Error(`Missing responsive image: ${slug}`)
  return {
    src: images.at(-1)!.url,
    srcset: images.map(({ url, width }) => `${url} ${width}w`).join(', ')
  }
}

export function getScreenshotImage(slug: string): ResponsiveImage {
  return getResponsiveImage('screenshots', slug)
}

export function getExampleImage(slug: string): ResponsiveImage {
  return getResponsiveImage('examples', slug)
}
