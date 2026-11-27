import type { BetterAuthClientPlugin } from 'better-auth/client'
import {
  anonymousClient,
  inferAdditionalFields
} from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/svelte'

export function createAllmapsAuthClient<
  Plugins extends BetterAuthClientPlugin[]
>(restBaseUrl: string, ...plugins: Plugins) {
  return createAuthClient({
    baseURL: restBaseUrl,
    basePath: '/auth',
    plugins: [
      anonymousClient(),
      inferAdditionalFields({
        user: { slug: { type: 'string', required: false } }
      }),
      ...plugins
    ]
  })
}
