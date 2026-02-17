import type { ResourceWithId } from './types.js'

export function getAnnotationUrl(resourceWithId: ResourceWithId) {
  return `https://annotations.allmaps.org/${resourceWithId.type}s/${resourceWithId.id}`
}
