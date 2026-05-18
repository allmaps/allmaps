import { t } from 'elysia'

import {
  queryUserLists,
  createUserList,
  queryListWithItems,
  updateUserListName,
  addItemToList,
  addItemToListByUrl,
  deleteListItem,
  deleteUserList
} from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { authenticatedDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'

function getUserId(user: unknown): string {
  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    typeof user.id !== 'string'
  ) {
    throw new Error('Invalid authenticated user')
  }

  return user.id
}

export function createListsRoutes(betterAuth: BetterAuthContext) {
  return createElysia({
    name: 'lists-routes'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/lists',
      ({ db, user, set }) => {
        setCacheControl(set, 'private-no-store')
        return queryUserLists(db, getUserId(user))
      },
      {
        auth: true,
        detail: {
          summary: 'Get current user lists',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .post(
      '/lists',
      ({ db, user, body, set }) => {
        setCacheControl(set, 'private-no-store')
        return createUserList(db, getUserId(user), body.name)
      },
      {
        auth: true,
        body: t.Object({
          name: t.String()
        }),
        detail: {
          summary: 'Create a list',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .get(
      '/lists/:listId',
      async ({ db, user, params, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const result = await queryListWithItems(
          db,
          getUserId(user),
          params.listId
        )

        if (!result) {
          return status(404, { error: 'List not found' })
        }

        return result
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        detail: {
          summary: 'Get a list with its items',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .patch(
      '/lists/:listId',
      async ({ db, user, params, body, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const name = body.name.trim()
        if (!name) {
          return status(400, { error: 'Name is required' })
        }

        const list = await updateUserListName(
          db,
          getUserId(user),
          params.listId,
          name
        )
        if (!list) {
          return status(404, { error: 'List not found' })
        }

        return list
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        body: t.Object({ name: t.String() }),
        detail: {
          summary: 'Update a list name',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .post(
      '/lists/:listId/items',
      async ({ db, user, params, body, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const userId = getUserId(user)
        const list = await queryListWithItems(db, userId, params.listId)

        if (!list) {
          return status(404, { error: 'List not found' })
        }

        return addItemToList(db, params.listId, body)
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        body: t.Union([
          t.Object({
            mapId: t.String(),
            mapImageId: t.String(),
            mapChecksum: t.String(),
            mapVersion: t.Number()
          }),
          t.Object({ imageId: t.String() }),
          t.Object({ canvasId: t.String() }),
          t.Object({ manifestId: t.String() })
        ]),
        detail: {
          summary: 'Add an item to a list',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .post(
      '/lists/:listId/items/url',
      async ({ db, user, params, body, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const userId = getUserId(user)
        const list = await queryListWithItems(db, userId, params.listId)

        if (!list) {
          return status(404, { error: 'List not found' })
        }

        const result = await addItemToListByUrl(db, params.listId, body.url)

        if (!result.success) {
          return status(result.status, { error: result.error })
        }

        return result.item
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        body: t.Object({ url: t.String() }),
        detail: {
          summary: 'Add an item to a list by URL',
          description:
            'Authenticated users only. Accepts annotations.allmaps.org URLs for maps, images, canvases, and manifests.',
          tags: ['Lists'],
          security: authenticatedDetail.security,
          'x-badges': authenticatedDetail['x-badges']
        }
      }
    )
    .delete(
      '/lists/:listId/items',
      async ({ db, user, params, query, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const userId = getUserId(user)
        const list = await queryListWithItems(db, userId, params.listId)

        if (!list) {
          return status(404, { error: 'List not found' })
        }

        const result = await deleteListItem(db, params.listId, query)

        if (!result.success) {
          return status(result.status, { error: result.error })
        }

        return result
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        query: t.Partial(
          t.Object({
            mapId: t.String(),
            imageId: t.String(),
            canvasId: t.String(),
            manifestId: t.String()
          })
        ),
        detail: {
          summary: 'Remove an item from a list',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
    .delete(
      '/lists/:listId',
      async ({ db, user, params, status, set }) => {
        setCacheControl(set, 'private-no-store')
        const result = await deleteUserList(db, getUserId(user), params.listId)
        if (!result.success) {
          return status(result.status, { error: result.error })
        }

        return result
      },
      {
        auth: true,
        params: t.Object({ listId: t.String() }),
        detail: {
          summary: 'Delete a list',
          tags: ['Lists'],
          ...authenticatedDetail
        }
      }
    )
}
