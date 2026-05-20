import { t } from 'elysia'

import { ResponseError, setCacheControl } from '@allmaps/api-shared'
import {
  queryLists,
  queryList,
  queryListGeoreferenceAnnotations
} from '@allmaps/api-shared/db'
import { createAuth } from '@allmaps/db/auth'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia } from '../elysia.js'

type SessionUser = {
  role?: string
  slug?: string | null
}

async function assertCanAccessUserLists(
  betterAuth: BetterAuthContext,
  headers: Headers,
  username: string
) {
  const { auth } = betterAuth
  const session = await auth.api.getSession({ headers })

  if (!session) {
    throw new ResponseError('Unauthorized', 401)
  }

  const user = session.user as SessionUser
  const isAdmin = user.role === 'admin'
  const userSlug = typeof user.slug === 'string' ? user.slug : null

  if (!isAdmin && userSlug !== username) {
    throw new ResponseError('Forbidden', 403)
  }
}

type UserList = Awaited<ReturnType<typeof queryLists>>[number]

export function createListsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext = createAuth(env)
) {
  return createElysia({
    name: 'lists'
  })
    .get(
      '/@:username/lists',
      async ({ db, env, params, request, set }) => {
        setCacheControl(set, 'private-no-store')
        await assertCanAccessUserLists(
          betterAuth,
          request.headers,
          params.username
        )
        const lists = await queryLists(db, params.username)

        return lists.map((list: UserList) => ({
          ...list,
          url: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/@${params.username}/lists/${list.id}`
        }))
      },
      {
        params: t.Object({
          username: t.String()
        }),
        detail: {
          summary: 'Get all lists for a single user',
          tags: ['Lists']
        }
      }
    )
    .get(
      '/@:username/lists/:listId',
      async ({ db, env, params, request, set }) => {
        setCacheControl(set, 'private-no-store')
        await assertCanAccessUserLists(
          betterAuth,
          request.headers,
          params.username
        )
        return queryList(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url
        )
      },
      {
        params: t.Object({
          username: t.String(),
          listId: t.String()
        }),
        detail: {
          summary: 'Get a single list',
          tags: ['Lists']
        }
      }
    )
    .get(
      '/@:username/lists/:listId/georeference-annotations',
      async ({ db, env, params, request, set }) => {
        setCacheControl(set, 'private-no-store')
        await assertCanAccessUserLists(
          betterAuth,
          request.headers,
          params.username
        )
        return queryListGeoreferenceAnnotations(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url
        )
      },
      {
        params: t.Object({
          username: t.String(),
          listId: t.String()
        }),
        detail: {
          summary: 'Get a single list as a Georeference Annotation',
          tags: ['Lists']
        }
      }
    )
}
