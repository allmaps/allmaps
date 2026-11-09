// Preserve URLs published by the previous Astro homepage, including generated
// package documentation. These entries also produce static redirect pages.
const legacyPackageNames = [
  'analyze',
  'annotation',
  'attach',
  'background-color',
  'basemap',
  'bearing',
  'env',
  'frame',
  'id',
  'iiif-inspector',
  'iiif-parser',
  'io',
  'leaflet',
  'maplibre',
  'openlayers',
  'project',
  'render',
  'render-wasm',
  'stdlib',
  'tailwind',
  'transform',
  'triangulate',
  'types',
  'ui',
  'warpedmaplayer'
]

const homepageRedirects: Record<string, string> = {
  '/getting-started': '/get-started',
  '/introduction': '/about',
  '/core-principles': '/about',
  '/timeline': '/about',
  '/guides/sustainability': '/faq#what-about-sustainability'
}

const docsRedirects: Record<string, string> = {
  '/docs': '/',
  '/docs/introduction': '/',
  '/docs/apps/cli': '/packages/cli',
  '/docs/apps/tileserver': '/packages/tileserver',
  '/docs/packages': '/packages',
  '/guides/finding-maps': '/guides/find-maps-to-georeference',
  ...Object.fromEntries(
    legacyPackageNames.map((name) => [
      `/docs/packages/${name}`,
      `/packages/${name}`
    ])
  )
}

export const legacyPathnames = [
  ...Object.keys(homepageRedirects),
  ...Object.keys(docsRedirects)
]

export function getLegacyRedirect(pathname: string, docsBaseUrl: string) {
  const normalizedPathname = pathname.replace(/\/$/, '')
  if (Object.hasOwn(homepageRedirects, normalizedPathname)) {
    return homepageRedirects[normalizedPathname]
  }
  if (Object.hasOwn(docsRedirects, normalizedPathname)) {
    return `${docsBaseUrl.replace(/\/$/, '')}${docsRedirects[normalizedPathname]}`
  }
}
