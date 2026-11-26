import { t } from 'elysia'

import { ResponseError, setCacheControl } from '@allmaps/api-shared'
import {
  queryLists,
  queryList,
  queryListGeoreferenceAnnotations
} from '@allmaps/api-shared/db'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'

type UserList = Awaited<ReturnType<typeof queryLists>>[number]

function getListOwnerId(user: unknown, username: string) {
  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    typeof user.id !== 'string' ||
    ('isAnonymous' in user && user.isAnonymous)
  ) {
    throw new ResponseError('Unauthorized', 401)
  }

  if ('role' in user && user.role === 'admin') return

  if (!('slug' in user) || user.slug !== username) {
    throw new ResponseError('Lists not found', 404)
  }

  return user.id
}

export function createListsRoutes(
  env: AnnotationsEnv,
  betterAuth: BetterAuthContext
) {
  return createElysia({
    name: 'lists'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/@:username/lists',
      async ({ db, env, params, set, user }) => {
        setCacheControl(set, 'private-no-store')
        const ownerId = getListOwnerId(user, params.username)
        const lists = await queryLists(db, params.username, ownerId)

        return lists.map((list: UserList) => ({
          ...list,
          url: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/@${params.username}/lists/${list.id}`
        }))
      },
      {
        auth: true,
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
      async ({ db, env, params, request, set, user }) => {
        setCacheControl(set, 'private-no-store')
        return queryList(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url,
          getListOwnerId(user, params.username)
        )
      },
      {
        auth: true,
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
      async ({ db, env, params, request, set, user }) => {
        setCacheControl(set, 'private-no-store')
        return queryListGeoreferenceAnnotations(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url,
          getListOwnerId(user, params.username)
        )
      },
      {
        auth: true,
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
