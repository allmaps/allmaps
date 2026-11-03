import { t } from 'elysia'

import { setCacheControl } from '@allmaps/api-shared'
import {
  queryLists,
  queryList,
  queryListGeoreferenceAnnotations
} from '@allmaps/api-shared/db'

import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnnotationsEnv } from '@allmaps/env/annotations'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'

type UserList = Awaited<ReturnType<typeof queryLists>>[number]

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
      async ({ db, env, params, set }) => {
        setCacheControl(set, 'private-no-store')
        const lists = await queryLists(db, params.username)

        return lists.map((list: UserList) => ({
          ...list,
          url: `${env.PUBLIC_ANNOTATIONS_BASE_URL}/@${params.username}/lists/${list.id}`
        }))
      },
      {
        admin: true,
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
        return queryList(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url
        )
      },
      {
        admin: true,
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
        return queryListGeoreferenceAnnotations(
          env.PUBLIC_ANNOTATIONS_BASE_URL,
          db,
          params.username,
          params.listId,
          request.url
        )
      },
      {
        admin: true,
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
