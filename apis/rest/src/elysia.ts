import {
  RegExpRoute,
  createElysia as createBaseElysia,
  createBetterAuthPlugin as createBaseBetterAuthPlugin,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { ElysiaConfig } from 'elysia'

import type { RestEnv } from '@allmaps/env/rest'

export function createElysia<const BasePath extends string = ''>(
  config?: ElysiaConfig<BasePath>
) {
  return createBaseElysia<RestEnv, BasePath>(config)
}

export function createBetterAuthPlugin() {
  return createBaseBetterAuthPlugin<RestEnv>()
}

export { RegExpRoute, error, handleApiError, redirect }
