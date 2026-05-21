import { command, query } from '$app/server'

import { restFetch } from '$lib/server/rest.js'
import { z } from 'zod'

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

const listIdSchema = z.string()

const createListSchema = z.object({
  name: z.string().trim().min(1)
}) satisfies z.ZodType<CreateListInput>

const renameListSchema = z.object({
  listId: listIdSchema,
  name: z.string().trim().min(1)
}) satisfies z.ZodType<RenameListInput>

const addListItemByUrlSchema = z.object({
  listId: listIdSchema,
  url: z.string().trim().min(1)
}) satisfies z.ZodType<AddListItemByUrlInput>

const removeListItemSchema = z
  .object({
    listId: listIdSchema,
    mapId: z.string().optional(),
    imageId: z.string().optional(),
    canvasId: z.string().optional(),
    manifestId: z.string().optional()
  })
  .refine(
    (item) => item.mapId || item.imageId || item.canvasId || item.manifestId,
    'Invalid list item'
  ) satisfies z.ZodType<RemoveListItemInput>

export const getLists = query(async () => {
  return restFetch<ListSummary[]>('/lists')
})

export const getList = query(listIdSchema, async (listId) => {
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
