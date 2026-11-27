import { generateId } from '@allmaps/id/sync'
import { fetchJson } from '@allmaps/stdlib'
import type { Source } from '$lib/types/shared.js'

type Bookmark = {
  id: string
  created: string
  allmapsUrl: string
  georeferencedMapCount: number
  target: {
    id: string
    'dcterms:title'?: string
    'dcterms:isPartOf'?: { 'dcterms:title'?: string }
    'schema:provider'?: { 'schema:name': string }
    fallbackImageService?: string
    imageService?: string
  }
}

export type SavedBookmark = Bookmark & { resource: StarredResource }
export type StarredList = {
  id: string
  georeferenceAnnotations: string
  name: string
  items: SavedBookmark[]
}

export async function getStarredList(
  base: string,
  username: string,
  signal: AbortSignal
): Promise<StarredList | undefined> {
  const options: RequestInit = { credentials: 'include', signal }
  const lists = (await fetchJson(
    `${base}/@${encodeURIComponent(username)}/lists`,
    options
  )) as { id: string; name: string; deletable: boolean; url: string }[]
  const starred = lists.find(
    (list) => list.name === 'Starred' && !list.deletable
  )
  if (!starred) return

  const collection = (await fetchJson(starred.url, options)) as {
    type: string
    georeferenceAnnotations: string
    label: string
    first?: { items: Bookmark[] }
  }
  if (
    collection.type !== 'AnnotationCollection' ||
    typeof collection.georeferenceAnnotations !== 'string'
  )
    throw new Error('Invalid starred list')
  const bookmarks: Bookmark[] = collection.first?.items ?? []
  return {
    id: starred.id,
    georeferenceAnnotations: collection.georeferenceAnnotations,
    name: collection.label,
    items: bookmarks.map(savedBookmark)
  }
}

function savedBookmark(bookmark: Bookmark): SavedBookmark {
  const resource = resourceFromPath(new URL(bookmark.allmapsUrl).pathname)
  if (!resource) throw new Error('Unknown starred resource')
  return { ...bookmark, resource }
}

export type StarredResource =
  | { type: 'map'; id: string; checksum?: string }
  | { type: 'image' | 'canvas' | 'manifest'; id: string }

function resourceFromPath(path: string): StarredResource | undefined {
  const match = path.match(
    /^\/(maps|images|canvases|manifests)\/([a-f0-9]+)(?:@([a-f0-9]+))?(?:\.json)?\/?$/
  )
  if (match) {
    const [, group, id, checksum] = match
    if (group === 'maps') return { type: 'map', id, checksum }
    if (group === 'images') return { type: 'image', id }
    if (group === 'canvases') return { type: 'canvas', id }
    if (group === 'manifests') return { type: 'manifest', id }
  }
}

export function getStarredResource(
  source: Source,
  annotationsBaseUrl: string
): StarredResource | undefined {
  if (source.sourceType !== 'url') return

  const url = new URL(source.url)
  if (url.origin === new URL(annotationsBaseUrl).origin) {
    const resource = resourceFromPath(url.pathname)
    if (resource) return resource
  }

  if (source.parsed.type === 'iiif') {
    const { iiif } = source.parsed
    if (iiif.type === 'image' || iiif.type === 'manifest') {
      return { type: iiif.type, id: generateId(iiif.uri) }
    }
  }
}

export function matchesResource(
  saved: StarredResource,
  resource: StarredResource
) {
  return (
    saved.type === resource.type &&
    saved.id === resource.id &&
    (resource.type !== 'map' ||
      !resource.checksum ||
      (saved.type === 'map' && saved.checksum === resource.checksum))
  )
}

export async function changeStarredItem(
  restBaseUrl: string,
  annotationsBaseUrl: string,
  list: StarredList,
  resource: StarredResource,
  starred: boolean,
  signal: AbortSignal
): Promise<SavedBookmark[]> {
  const endpoint = `${restBaseUrl}/lists/${encodeURIComponent(list.id)}/items`
  const idField = `${resource.type}Id` as const
  const checksum = resource.type === 'map' ? resource.checksum : undefined
  const options: RequestInit = { credentials: 'include', signal }

  if (!starred) {
    const params = new URLSearchParams({ [idField]: resource.id })
    if (checksum) params.set('mapChecksum', checksum)
    const response = await fetch(`${endpoint}?${params}`, {
      ...options,
      method: 'DELETE'
    })
    if (!response.ok)
      throw new Error('Could not remove from Starred. Try again.')
    return list.items.filter(
      (item) => !matchesResource(item.resource, resource)
    )
  }

  const group = resource.type === 'canvas' ? 'canvases' : `${resource.type}s`
  const revision = checksum ? `@${encodeURIComponent(checksum)}` : ''
  const url = `${annotationsBaseUrl}/${group}/${encodeURIComponent(resource.id)}${revision}`
  const response = await fetch(`${endpoint}/url`, {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  })

  if (response.status === 409) throw new Error('Starred is full.')
  if (response.status === 404)
    throw new Error('This item is unavailable in Allmaps.')
  if (!response.ok) throw new Error('Could not add to Starred. Try again.')

  const { bookmark } = (await response.json()) as { bookmark: Bookmark }
  const saved = savedBookmark(bookmark)
  return [saved, ...list.items.filter((item) => item.id !== saved.id)].sort(
    (a, b) => b.created.localeCompare(a.created)
  )
}
