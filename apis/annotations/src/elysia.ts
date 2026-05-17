import {
  RegExpRoute,
  createTypedElysiaHelpers,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { AnnotationsEnv } from '@allmaps/env/annotations'

const { createElysia, createBetterAuthPlugin, createBetterAuthRoutes } =
  createTypedElysiaHelpers<AnnotationsEnv>()

export { createElysia, createBetterAuthPlugin, createBetterAuthRoutes }
export { RegExpRoute, error, handleApiError, redirect }
