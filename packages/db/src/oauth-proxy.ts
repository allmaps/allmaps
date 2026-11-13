import type { BetterAuthEnv } from '@allmaps/env'

type Settings = Omit<BetterAuthEnv, 'DATABASE_URL'>
const coordinator = 'https://dev.api.allmaps.org'
const developmentOrigin =
  /^https:\/\/dev(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)?\.allmaps\.org$/
const previewOrigin =
  /^https:\/\/pr-[a-z0-9]+(?:-[a-z0-9]+)*\.preview\.(console|api)\.allmaps\.org$/
const isNonProductionOrigin = (origin: string) =>
  developmentOrigin.test(origin) || previewOrigin.test(origin)

// Fail closed if preview settings accidentally reach a production deployment.
export function getOAuthProxyConfiguration(env: Settings) {
  if (env.OAUTH_PROXY_ENABLED !== 'true') return undefined
  const base = new URL(env.BETTER_AUTH_URL)
  if (
    !isNonProductionOrigin(base.origin) ||
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
    throw new Error('OAuth Proxy requires trusted preview origins')
  const previewPattern =
    /^https:\/\/pr-\*\.preview\.(console|api)\.allmaps\.org$/
  for (const value of origins) {
    if (previewPattern.test(value)) continue
    const url = new URL(value)
    if (url.origin !== value || !isNonProductionOrigin(url.origin)) {
      throw new Error(
        'OAuth Proxy origins must be non-production HTTPS Allmaps origins or scoped PR preview patterns'
      )
    }
  }
  if (
    base.origin !== coordinator &&
    !origins.some((origin) =>
      previewPattern.test(origin)
        ? base.origin.replace(
            /^https:\/\/pr-[a-z0-9]+(?:-[a-z0-9]+)*(?=\.preview\.)/,
            'https://pr-*'
          ) === origin
        : origin === base.origin
    )
  )
    throw new Error(
      'Preview auth origin is missing from the OAuth Proxy allowlist'
    )
  return {
    productionURL: coordinator,
    currentURL: base.origin,
    secret: env.OAUTH_PROXY_SECRET,
    trustedOrigins: [
      ...new Set([
        coordinator,
        'https://dev.allmaps.org',
        'https://dev.*.allmaps.org',
        ...origins
      ])
    ]
  }
}
