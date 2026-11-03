import { t } from 'elysia'

import {
  queryUserLists,
  createUserList,
  queryUserList,
  queryListWithItems,
  updateUserListName,
  addItemToList,
  addItemToListByUrl,
  deleteListItem,
  deleteUserList
} from '@allmaps/api-shared/db'
import { setCacheControl } from '@allmaps/api-shared'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'

const deleteListItemQuerySchema = t.Object({
  mapId: t.Optional(t.String()),
  imageId: t.Optional(t.String()),
  canvasId: t.Optional(t.String()),
  manifestId: t.Optional(t.String())
})

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
        admin: true,
        detail: {
          summary: 'Get current user lists',
          tags: ['Lists'],
          ...adminDetail
        }
      }
    )
    .post(
      '/lists',
      ({ db, user, body, set, status }) => {
        setCacheControl(set, 'private-no-store')
        if (body.name.trim().toLowerCase() === 'starred') {
          return status(403, { error: 'The Starred list already exists' })
        }
        return createUserList(db, getUserId(user), body.name)
      },
      {
        admin: true,
        body: t.Object({
          name: t.String()
        }),
        detail: {
          summary: 'Create a list',
          tags: ['Lists'],
          ...adminDetail
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
        admin: true,
        params: t.Object({ listId: t.String() }),
        detail: {
          summary: 'Get a list with its items',
          tags: ['Lists'],
          ...adminDetail
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

        const currentList = await queryUserList(
          db,
          getUserId(user),
          params.listId
        )
        if (!currentList) {
          return status(404, { error: 'List not found' })
        }
        if (!currentList.deletable) {
          return status(403, { error: 'This list cannot be renamed' })
        }
        if (name.toLowerCase() === 'starred') {
          return status(403, { error: 'The Starred list already exists' })
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
        admin: true,
        params: t.Object({ listId: t.String() }),
        body: t.Object({ name: t.String() }),
        detail: {
          summary: 'Update a list name',
          tags: ['Lists'],
          ...adminDetail
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
        admin: true,
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
          ...adminDetail
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
        admin: true,
        params: t.Object({ listId: t.String() }),
        body: t.Object({ url: t.String() }),
        detail: {
          summary: 'Add an item to a list by URL',
          description:
            'Admin only. Accepts annotations.allmaps.org URLs for maps, images, canvases, and manifests.',
          tags: ['Lists'],
          security: adminDetail.security,
          'x-badges': adminDetail['x-badges']
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
        admin: true,
        params: t.Object({ listId: t.String() }),
        query: deleteListItemQuerySchema,
        detail: {
          summary: 'Remove an item from a list',
          tags: ['Lists'],
          ...adminDetail
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
        admin: true,
        params: t.Object({ listId: t.String() }),
        detail: {
          summary: 'Delete a list',
          tags: ['Lists'],
          ...adminDetail
        }
      }
    )
}
