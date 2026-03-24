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
  return new Elysia<BasePath, DecoratedElysia<TEnv>>(config).mapResponse(
    ({ response, set }) => {
      if (
        response instanceof Response ||
        response === undefined ||
        response === null ||
        typeof response !== 'object'
      ) {
        return
      }

      const headers = new Headers()

      for (const [key, value] of Object.entries(set.headers)) {
        headers.set(key, String(value))
      }

      headers.set('content-type', 'application/json; charset=utf-8')

      return new Response(JSON.stringify(response, null, 2), {
        headers,
        status: typeof set.status === 'number' ? set.status : undefined
      })
    }
  )
}
