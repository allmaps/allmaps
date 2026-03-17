import {
  RegExpRoute,
  createElysia as createBaseElysia,
  createBetterAuthPlugin as createBaseBetterAuthPlugin,
  error,
  handleApiError,
  redirect
} from '@allmaps/api-shared/elysia'

import type { ElysiaConfig } from 'elysia'

import type { AnnotationsEnv } from '@allmaps/env/annotations'

export function createElysia<const BasePath extends string = ''>(
  config?: ElysiaConfig<BasePath>
) {
  return createBaseElysia<AnnotationsEnv, BasePath>(config)
}

export function createBetterAuthPlugin() {
  return createBaseBetterAuthPlugin<AnnotationsEnv>()
}

export { RegExpRoute, error, handleApiError, redirect }
