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
import { ResponseError, setCacheControl } from '@allmaps/api-shared'

import { createElysia, createBetterAuthPlugin } from '../elysia.js'
import { adminDetail, authenticatedDetail } from '../openapi.js'
import type { BetterAuthContext } from '@allmaps/db/auth'

const deleteListItemQuerySchema = t.Object({
  mapId: t.Optional(t.String()),
  imageId: t.Optional(t.String()),
  canvasId: t.Optional(t.String()),
  manifestId: t.Optional(t.String())
})

const starredListItemLimit = 500

function getListUser(user: unknown) {
  if (
    !user ||
    typeof user !== 'object' ||
    !('id' in user) ||
    typeof user.id !== 'string' ||
    ('isAnonymous' in user && user.isAnonymous)
  ) {
    throw new ResponseError('Unauthorized', 401)
  }

  return {
    id: user.id,
    isAdmin: 'role' in user && user.role === 'admin'
  }
}

function isStarredList(list: { name: string; deletable: boolean }) {
  return list.name === 'Starred' && !list.deletable
}

function canAccessList(
  list: { name: string; deletable: boolean } | null | undefined,
  user: ReturnType<typeof getListUser>
) {
  return list && (user.isAdmin || isStarredList(list))
}

export function createListsRoutes(betterAuth: BetterAuthContext) {
  return createElysia({
    name: 'lists-routes'
  })
    .use(createBetterAuthPlugin(betterAuth))
    .get(
      '/lists',
      async ({ db, user, set }) => {
        setCacheControl(set, 'private-no-store')
        const listUser = getListUser(user)
        const lists = await queryUserLists(db, listUser.id)
        return listUser.isAdmin ? lists : lists.filter(isStarredList)
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
      ({ db, user, body, set, status }) => {
        setCacheControl(set, 'private-no-store')
        if (body.name.trim().toLowerCase() === 'starred') {
          return status(403, { error: 'The Starred list already exists' })
        }
        return createUserList(db, getListUser(user).id, body.name)
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
        const listUser = getListUser(user)
        const result = await queryListWithItems(db, listUser.id, params.listId)

        if (!canAccessList(result, listUser)) {
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

        const currentList = await queryUserList(
          db,
          getListUser(user).id,
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
          getListUser(user).id,
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
        const listUser = getListUser(user)
        const list = await queryUserList(db, listUser.id, params.listId)

        if (!canAccessList(list, listUser)) {
          return status(404, { error: 'List not found' })
        }

        return addItemToList(
          db,
          params.listId,
          body,
          listUser.isAdmin ? undefined : starredListItemLimit
        )
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
        const listUser = getListUser(user)
        const list = await queryUserList(db, listUser.id, params.listId)

        if (!canAccessList(list, listUser)) {
          return status(404, { error: 'List not found' })
        }

        const result = await addItemToListByUrl(
          db,
          params.listId,
          body.url,
          listUser.isAdmin ? undefined : starredListItemLimit
        )

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
        const listUser = getListUser(user)
        const list = await queryUserList(db, listUser.id, params.listId)

        if (!canAccessList(list, listUser)) {
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
        query: deleteListItemQuerySchema,
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
        const result = await deleteUserList(
          db,
          getListUser(user).id,
          params.listId
        )
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
