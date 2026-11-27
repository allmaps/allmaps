import type { StarredList } from './starred.js'

export function viewerHref(viewerPath: string, url: string) {
  return `${viewerPath}?${new URLSearchParams({ url })}`
}

export function getStarredOpenAllHref(
  list: StarredList | undefined,
  viewerPath: string
) {
  return list?.items.some((bookmark) => bookmark.georeferencedMapCount > 0)
    ? viewerHref(viewerPath, list.georeferenceAnnotations)
    : null
}
