import type { ElysiaConfig } from 'elysia'
import type { BetterAuthContext } from '@allmaps/db/auth'

import { createElysia as createBaseElysia } from './elysia/app.js'
import {
  createBetterAuthPlugin as createBaseBetterAuthPlugin,
  createBetterAuthRoutes as createBaseBetterAuthRoutes
} from './elysia/auth.js'

export { createElysia } from './elysia/app.js'
export {
  createBetterAuthPlugin,
  createBetterAuthRoutes
} from './elysia/auth.js'
export { error, redirect } from './elysia/response.js'
export { handleApiError } from './elysia/errors.js'
export { RegExpRoute } from './elysia/routes.js'

export type { DecoratedElysia } from './elysia/app.js'

export function createTypedElysiaHelpers<TEnv>() {
  return {
    createElysia<const BasePath extends string = ''>(
      config?: ElysiaConfig<BasePath>
    ) {
      return createBaseElysia<TEnv, BasePath>(config)
    },
    createBetterAuthPlugin(betterAuth: BetterAuthContext) {
      return createBaseBetterAuthPlugin<TEnv>(betterAuth)
    },
    createBetterAuthRoutes(betterAuth: BetterAuthContext) {
      return createBaseBetterAuthRoutes<TEnv>(betterAuth)
    }
  }
}
