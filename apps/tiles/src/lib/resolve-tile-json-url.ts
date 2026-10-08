export function resolveTileJsonUrl(value: string): string {
  const url = new URL(value.trim())

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Enter an HTTP or HTTPS URL.')
  }

  const resourcePath = /^\/(maps|images|manifests)\/[^/]+\/?$/

  if (
    (url.hostname === 'annotations.allmaps.org' ||
      url.hostname === 'dev.annotations.allmaps.org') &&
    resourcePath.test(url.pathname)
  ) {
    url.hostname =
      url.hostname === 'dev.annotations.allmaps.org'
        ? 'dev.allmaps.xyz'
        : 'allmaps.xyz'
    url.pathname = `${url.pathname.replace(/\/$/, '')}/tiles.json`
  } else if (
    url.hostname === 'allmaps.xyz' ||
    url.hostname === 'dev.allmaps.xyz'
  ) {
    // Browsers may encode the braces when copying a template URL.
    const pathname = url.pathname.replace(/%7B/gi, '{').replace(/%7D/gi, '}')
    url.pathname = pathname.replace(
      /\/\{z\}\/\{x\}\/\{y\}(@2x)?\.(png|webp)$/,
      (_, resolution: string | undefined) => `/tiles${resolution || ''}.json`
    )
  }

  return url.href
}
