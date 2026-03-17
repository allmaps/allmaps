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

import { createElysia } from '../elysia.js'
import type { createBetterAuthRoutes } from './auth.js'

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

export function createLists(
  betterAuthPlugin: ReturnType<typeof createBetterAuthRoutes>
) {
  return createElysia({ name: 'lists' })
  .use(betterAuthPlugin)
  .get('/lists', ({ db, user }) => queryUserLists(db, getUserId(user)), {
    auth: true,
    detail: {
      summary: 'Get current user lists',
      tags: ['Lists']
    }
  })
  .post(
    '/lists',
    ({ db, user, body }) => createUserList(db, getUserId(user), body.name),
    {
      auth: true,
      body: t.Object({
        name: t.String()
      }),
      detail: {
        summary: 'Create a list',
        tags: ['Lists']
      }
    }
  )
  .get(
    '/lists/:listId',
    async ({ db, user, params, status }) => {
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
        tags: ['Lists']
      }
    }
  )
  .patch(
    '/lists/:listId',
    async ({ db, user, params, body, status }) => {
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
        tags: ['Lists']
      }
    }
  )
  .post(
    '/lists/:listId/items',
    async ({ db, user, params, body, status }) => {
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
        tags: ['Lists']
      }
    }
  )
  .post(
    '/lists/:listId/items/url',
    async ({ db, user, params, body, status }) => {
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
          'Accepts annotations.allmaps.org URLs for maps, images, canvases, and manifests',
        tags: ['Lists']
      }
    }
  )
  .delete(
    '/lists/:listId/items',
    async ({ db, user, params, query, status }) => {
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
        tags: ['Lists']
      }
    }
  )
  .delete(
    '/lists/:listId',
    async ({ db, user, params, status }) => {
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
        tags: ['Lists']
      }
    }
  )
}
