export { generateFeature, generateFeatureCollection } from './shared/geojson.js'
export {
  fromDbRow,
  toDbMap3,
  getCompleteGcps,
  dbMapToDbMap3,
  toGeoreferencedMapProjection
} from './shared/maps.js'

export { ResponseError } from './shared/errors.js'
export { DEFAULT_LIMIT, MAX_LIMIT, clampLimit } from './shared/limits.js'
export { normalizeMapsQueryParams } from './shared/query-params.js'
export { queryRandom } from './shared/random.js'
export { setCacheControl } from './elysia/cache.js'

export type { CacheControlPreset } from './elysia/cache.js'
