import { Elysia } from 'elysia'

import type { SingletonBase, ElysiaConfig } from 'elysia'

import type { Db } from '@allmaps/db'

export type DecoratedElysia<TEnv> = SingletonBase & {
  decorator: {
    db: Db
    env: TEnv
  }
}

export function createElysia<TEnv, const BasePath extends string = ''>(
  config?: ElysiaConfig<BasePath>
) {
  return new Elysia<BasePath, DecoratedElysia<TEnv>>(config)
}
