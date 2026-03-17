import {
  RegExpRoute,
  createElysia as createBaseElysia,
  createBetterAuthPlugin as createBaseBetterAuthPlugin,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { ElysiaConfig } from 'elysia'
import type { BetterAuthContext } from '@allmaps/db'

import type { AnnotationsEnv } from '@allmaps/env/annotations'

export function createElysia<const BasePath extends string = ''>(
  config?: ElysiaConfig<BasePath>
) {
  return createBaseElysia<AnnotationsEnv, BasePath>(config)
}

export function createBetterAuthPlugin(betterAuth: BetterAuthContext) {
  return createBaseBetterAuthPlugin<AnnotationsEnv>(betterAuth)
}

export { RegExpRoute, error, handleApiError, redirect }
