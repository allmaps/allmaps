import { consoleEnv } from '$lib/server/console-env.js'
import { z } from 'zod'

import type { LayoutServerLoad } from './$types'

const loginMetadataSchema = z.object({
  login: z.string().url().optional(),
  loginProviders: z
    .array(
      z.object({
        provider: z.enum(['github', 'google']),
        url: z.string().url()
      })
    )
    .optional()
})

async function fetchLoginProviders(fetch: typeof globalThis.fetch) {
  try {
    const response = await fetch(`${consoleEnv.PUBLIC_REST_BASE_URL}/`, {
      // Login availability must not depend on the current user's session.
      credentials: 'omit',
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) return []
    const { login, loginProviders } = loginMetadataSchema.parse(
      await response.json()
    )
    return (
      loginProviders ??
      (login ? [{ provider: 'github' as const, url: login }] : [])
    )
  } catch {
    // Optional login metadata should not prevent the page from loading.
    return []
  }
}

export const load: LayoutServerLoad = async ({ locals, url, fetch }) => {
  // Make SvelteKit rerun this layout load when the route path changes. Session
  // state can change outside this app (for example during OAuth sign-in).
  void url.pathname

  const [session, loginProviders] = await Promise.all([
    locals.getConsoleSession(),
    fetchLoginProviders(fetch)
  ])

  return { env: consoleEnv, session, loginProviders }
}
