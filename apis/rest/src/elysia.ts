import {
  RegExpRoute,
  createTypedElysiaHelpers,
  createBetterAuthPlugin as createBaseBetterAuthPlugin,
  createTagsSorter,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { RestEnv } from '@allmaps/env/rest'

const { createElysia, createBetterAuthPlugin, createBetterAuthRoutes } =
  createTypedElysiaHelpers<RestEnv>()

export { createElysia, createBetterAuthPlugin, createBetterAuthRoutes }
export { RegExpRoute, createTagsSorter, error, handleApiError, redirect }

export function createRestAppWithAuth(betterAuth: BetterAuthContext) {
  return createElysia({ name: 'app-with-auth' }).use(
    createBaseBetterAuthPlugin<RestEnv>(betterAuth)
  )
}

export type RestAppWithAuth = ReturnType<typeof createRestAppWithAuth>
