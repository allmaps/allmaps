import type { AllmapsId } from '$lib/types/shared.js'

export function getAllmapsIdFromUrl(url: string): AllmapsId | undefined {
  const parsedUrl = new URL(url)
  if (parsedUrl.hostname.endsWith('allmaps.org')) {
    // Match /manifests/{id}, /images/{id}, or /maps/{id} at end of path
    const match = parsedUrl.pathname.match(
      /\/(manifests|images|maps)\/([a-zA-Z0-9]{16})$/
    )
    if (match) {
      const [, sourceType, id] = match
      return `${sourceType}/${id}` as AllmapsId
    }
  }
}
