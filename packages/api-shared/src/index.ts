export { generateFeature, generateFeatureCollection } from './shared/geojson.js'
export {
  fromDbRow,
  toDbMap3,
  getCompleteGcps,
  dbMapToDbMap3,
  toGeoreferencedMapProjection
} from './shared/maps.js'

export { ResponseError } from './shared/errors.js'
export {
  DEFAULT_LIMIT,
  PUBLIC_MAX_LIMIT,
  USER_MAX_LIMIT,
  PAID_ORGANIZATION_MEMBER_MAX_LIMIT,
  ADMIN_MAX_LIMIT,
  clampLimit,
  needsElevatedLimitRole
} from './shared/limits.js'
export type { UserRole } from './shared/limits.js'
export {
  normalizeMapsQueryParams,
  normalizeOrganizationsQueryParams
} from './shared/query-params.js'
export { queryRandom } from './shared/random.js'
export { setCacheControl } from './elysia/cache.js'

export type { CacheControlPreset } from './elysia/cache.js'
