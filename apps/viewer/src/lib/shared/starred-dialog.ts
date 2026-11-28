import { Manifest } from '@allmaps/iiif-parser'
import { fetchImageInfo, fetchJson } from '@allmaps/stdlib'
import type { ListDialogItem } from '@allmaps/ui/list-dialog'
import type { SavedBookmark, StarredList } from './starred.js'

export function viewerHref(viewerPath: string, url: string) {
  return `${viewerPath}?${new URLSearchParams({ url })}`
}

function thumbnail({
  target,
  resource
}: SavedBookmark): ListDialogItem['thumbnail'] {
  if (!target.imageService && resource.type !== 'manifest') return

  return {
    async loadImageInfo(signal) {
      const options = { credentials: 'omit', signal } as const
      let uri = target.imageService
      if (!uri) {
        try {
          const manifest = await fetchJson(target.id, options)
          uri = Manifest.parse(manifest).canvases[0]?.image.uri
        } catch {
          signal.throwIfAborted()
        }
        uri ??= target.fallbackImageService
      }
      if (uri) return fetchImageInfo(uri, options)
    }
  }
}

export function getStarredOpenAllHref(
  list: StarredList | undefined,
  viewerPath: string
) {
  return list?.items.some((bookmark) => bookmark.georeferencedMapCount > 0)
    ? viewerHref(viewerPath, list.georeferenceAnnotations)
    : null
}

export function getStarredDialogItems(
  items: SavedBookmark[],
  viewerPath: string
): ListDialogItem[] {
  return items.map((bookmark) => {
    const { target, resource, georeferencedMapCount } = bookmark
    const type = resource.type[0].toUpperCase() + resource.type.slice(1)
    const label = target['dcterms:title'] ?? `${type} ${resource.id}`
    const item = { id: bookmark.id, label, thumbnail: thumbnail(bookmark) }
    if (georeferencedMapCount > 0) {
      const detail = [
        target['dcterms:isPartOf']?.['dcterms:title'],
        target['schema:provider']?.['schema:name']
      ]
        .filter((value) => value && value !== label)
        .join(' · ')
      return {
        ...item,
        detail: detail || type,
        href: viewerHref(viewerPath, bookmark.allmapsUrl)
      }
    }
    if (resource.type === 'manifest') {
      return {
        ...item,
        detail: 'Open in Allmaps Editor to start georeferencing',
        href: `https://editor.allmaps.org/images?${new URLSearchParams({ url: target.id })}`
      }
    }
    return { ...item, detail: 'No georeferenced maps yet' }
  })
}
