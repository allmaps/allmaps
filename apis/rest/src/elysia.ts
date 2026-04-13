import {
  RegExpRoute,
  createTypedElysiaHelpers,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { RestEnv } from '@allmaps/env/rest'

const { createElysia, createBetterAuthPlugin, createBetterAuthRoutes } =
  createTypedElysiaHelpers<RestEnv>()

export { createElysia, createBetterAuthPlugin, createBetterAuthRoutes }
export { RegExpRoute, error, handleApiError, redirect }
