import type { SignInProvider } from './types.js'

export const loginProviderLoaderKey = Symbol('loginProviderLoader')

export async function fetchLoginProviders(
  apiBaseUrl: string,
  returnTo: string,
  signal: AbortSignal,
  fetchFn = fetch
): Promise<SignInProvider[]> {
  const endpoint = new URL(apiBaseUrl, returnTo)
  const response = await fetchFn(endpoint, { credentials: 'omit', signal })
  if (!response.ok) throw new Error('Could not load login methods.')

  const { loginProviders, login } = await response.json()
  // Older Allmaps APIs advertise GitHub through the login field.
  const providers: unknown =
    loginProviders ?? (login ? [{ provider: 'github', url: login }] : [])
  if (!Array.isArray(providers)) throw new Error('Invalid login methods.')

  return providers.map((entry) => {
    if (typeof entry?.provider !== 'string' || typeof entry.url !== 'string') {
      throw new Error('Invalid login method.')
    }
    const url = new URL(entry.url, endpoint)
    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error('Invalid login URL.')
    }
    url.searchParams.set('returnTo', returnTo)
    return { provider: entry.provider, url: url.href }
  })
}
