import { fetchJson } from '@allmaps/stdlib'

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
