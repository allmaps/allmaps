import type { Env, ResourceWithId } from './types.js'

export function getAnnotationUrl(env: Env, resourceWithId: ResourceWithId) {
  return `${env.PUBLIC_ANNOTATIONS_BASE_URL}/${resourceWithId.type}s/${resourceWithId.id}`
}
