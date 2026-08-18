import { consoleEnv } from '$lib/server/console-env.js'

import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Make SvelteKit rerun this layout load when the route path changes. Session
  // state can change outside this app (for example during OAuth sign-in).
  void url.pathname

  return {
    env: consoleEnv,
    session: await locals.getConsoleSession()
  }
}
