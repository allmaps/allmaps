import type { BetterAuthEnv } from '@allmaps/env'

type Settings = Omit<BetterAuthEnv, 'DATABASE_URL'>
const coordinator = 'https://dev.api.allmaps.org'
const developmentOrigins = [
  'https://dev.allmaps.org',
  'https://dev.console.allmaps.org',
  'https://dev.editor.allmaps.org',
  'https://dev.here.allmaps.org',
  'https://dev.explore.allmaps.org',
  'https://dev.latest.allmaps.org',
  'https://dev.viewer.allmaps.org',
  'https://dev.tiles.allmaps.org',
  'https://dev.docs.allmaps.org'
]
const production = new Set([
  'https://api.allmaps.org',
  'https://console.allmaps.org',
  'https://allmaps.org'
])

// Fail closed if preview settings accidentally reach a production deployment.
export function getOAuthProxyConfiguration(env: Settings) {
  if (env.OAUTH_PROXY_ENABLED !== 'true') return undefined
  const base = new URL(env.BETTER_AUTH_URL)
  if (
    base.protocol !== 'https:' ||
    !base.hostname.endsWith('.allmaps.org') ||
    production.has(base.origin) ||
    env.BETTER_AUTH_COOKIE_PREFIX === 'allmaps'
  ) {
    throw new Error(
      'OAuth Proxy is only available for trusted Allmaps development and preview deployments'
    )
  }
  if (env.OAUTH_PROXY_URL !== coordinator)
    throw new Error('OAuth Proxy must use the fixed develop callback server')
  if (
    !env.OAUTH_PROXY_SECRET ||
    env.OAUTH_PROXY_SECRET.length < 32 ||
    env.OAUTH_PROXY_SECRET === env.BETTER_AUTH_SECRET
  ) {
    throw new Error(
      'OAuth Proxy requires a dedicated secret distinct from BETTER_AUTH_SECRET'
    )
  }
  const origins = (env.OAUTH_PROXY_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  if (!origins.length)
    throw new Error('OAuth Proxy requires explicit trusted preview origins')
  for (const value of origins) {
    const url = new URL(value)
    if (
      url.origin !== value ||
      url.protocol !== 'https:' ||
      !url.hostname.endsWith('.allmaps.org') ||
      production.has(url.origin) ||
      url.hostname.includes('*')
    ) {
      throw new Error(
        'OAuth Proxy origins must be explicit non-production HTTPS Allmaps origins'
      )
    }
  }
  if (base.origin !== coordinator && !origins.includes(base.origin))
    throw new Error(
      'Preview auth origin is missing from the OAuth Proxy allowlist'
    )
  return {
    productionURL: coordinator,
    currentURL: base.origin,
    secret: env.OAUTH_PROXY_SECRET,
    trustedOrigins: [
      ...new Set([coordinator, ...developmentOrigins, ...origins])
    ]
  }
}
