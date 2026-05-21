import { command, query } from '$app/server'

import {
  assertNonEmptyString,
  assertObject,
  assertString,
  schema,
  stringSchema
} from '$lib/remote-schema.js'
import { restFetch } from '$lib/server/rest.js'

export type LanguageString = {
  [language: string]: (string | number | boolean)[]
}

export type ListItem = {
  listId: string
  mapId: string | null
  mapImageId: string | null
  mapChecksum: string | null
  mapVersion: number | null
  imageId: string | null
  canvasId: string | null
  manifestId: string | null
  createdAt: string | null
  canvasLabel: LanguageString | null
  manifestLabel: LanguageString | null
}

export type ListSummary = {
  id: string
  name: string
  label: string | null
  createdAt: string
}

export type ListDetail = ListSummary & {
  items: ListItem[]
}

type CreateListInput = {
  name: string
}

type RenameListInput = {
  listId: string
  name: string
}

type AddListItemByUrlInput = {
  listId: string
  url: string
}

type RemoveListItemInput = {
  listId: string
  mapId?: string
  imageId?: string
  canvasId?: string
  manifestId?: string
}

const createListSchema = schema<CreateListInput>((value) => {
  assertObject(value, 'list')
  assertNonEmptyString(value.name, 'list name')

  return { name: value.name.trim() }
})

const renameListSchema = schema<RenameListInput>((value) => {
  assertObject(value, 'list')
  assertString(value.listId, 'list id')
  assertNonEmptyString(value.name, 'list name')

  return {
    listId: value.listId,
    name: value.name.trim()
  }
})

const addListItemByUrlSchema = schema<AddListItemByUrlInput>((value) => {
  assertObject(value, 'list item')
  assertString(value.listId, 'list id')
  assertNonEmptyString(value.url, 'item URL')

  return {
    listId: value.listId,
    url: value.url.trim()
  }
})

const removeListItemSchema = schema<RemoveListItemInput>((value) => {
  assertObject(value, 'list item')
  assertString(value.listId, 'list id')

  const input: RemoveListItemInput = {
    listId: value.listId
  }

  for (const key of ['mapId', 'imageId', 'canvasId', 'manifestId'] as const) {
    const id = value[key]

    if (id !== undefined) {
      assertString(id, key)
      input[key] = id
    }
  }

  if (!input.mapId && !input.imageId && !input.canvasId && !input.manifestId) {
    throw new Error('Invalid list item')
  }

  return input
})

export const getLists = query(async () => {
  return restFetch<ListSummary[]>('/lists')
})

export const getList = query(stringSchema('list id'), async (listId) => {
  return restFetch<ListDetail>(`/lists/${listId}`)
})

export const createList = command<
  typeof createListSchema,
  Promise<ListSummary>
>(createListSchema, async ({ name }) => {
  const list = await restFetch<ListSummary>('/lists', {
    method: 'POST',
    json: { name }
  })

  void getLists().refresh()

  return list
})

export const renameList = command<typeof renameListSchema, Promise<ListDetail>>(
  renameListSchema,
  async ({ listId, name }) => {
    const list = await restFetch<ListDetail>(`/lists/${listId}`, {
      method: 'PATCH',
      json: { name }
    })

    void getLists().refresh()
    void getList(listId).refresh()

    return list
  }
)

export const addListItemByUrl = command<
  typeof addListItemByUrlSchema,
  Promise<void>
>(addListItemByUrlSchema, async ({ listId, url }) => {
  await restFetch(`/lists/${listId}/items/url`, {
    method: 'POST',
    json: { url }
  })

  void getList(listId).refresh()
})

export const removeListItem = command<
  typeof removeListItemSchema,
  Promise<void>
>(removeListItemSchema, async ({ listId, ...item }) => {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(item)) {
    if (value) {
      params.set(key, value)
    }
  }

  await restFetch(`/lists/${listId}/items?${params}`, {
    method: 'DELETE'
  })

  void getList(listId).refresh()
})
