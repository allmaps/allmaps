import { consoleEnv } from '$lib/server/console-env.js'

import type { LayoutServerLoad } from './$types'

async function fetchLoginUrl(fetch: typeof globalThis.fetch) {
  try {
    const response = await fetch(`${consoleEnv.PUBLIC_REST_BASE_URL}/`, {
      // Login availability must not depend on the current user's session.
      credentials: 'omit',
      signal: AbortSignal.timeout(10_000)
    })
    if (!response.ok) return undefined
    const { login } = await response.json()
    return typeof login === 'string' ? login : undefined
  } catch {
    // Optional login metadata should not prevent the page from loading.
    return undefined
  }
}

export const load: LayoutServerLoad = async ({ locals, url, fetch }) => {
  // Make SvelteKit rerun this layout load when the route path changes. Session
  // state can change outside this app (for example during OAuth sign-in).
  void url.pathname

  const [session, loginUrl] = await Promise.all([
    locals.getConsoleSession(),
    fetchLoginUrl(fetch)
  ])

  return { env: consoleEnv, session, loginUrl }
}
