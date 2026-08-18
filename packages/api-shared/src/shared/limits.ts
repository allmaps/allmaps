import { DEFAULT_LIMIT, MAX_LIMITS, PUBLIC_MAX_LIMIT } from './tiers.js'

import type { UserRole } from './tiers.js'

export {
  ADMIN_MAX_LIMIT,
  ADMIN_MAX_PAGES,
  DEFAULT_LIMIT,
  ORGANIZATION_PLAN_MEMBER_MAX_LIMIT,
  ORGANIZATION_PLAN_MEMBER_MAX_PAGES,
  PUBLIC_MAX_LIMIT,
  PUBLIC_MAX_PAGES,
  USER_MAX_LIMIT,
  USER_MAX_PAGES
} from './tiers.js'
export type { UserRole } from './tiers.js'

function getMaxLimitForRole(role: UserRole): number {
  return MAX_LIMITS[role]
}

export function clampLimit(
  limit: number | undefined,
  userRole: UserRole = 'public'
): number {
  const maxLimit = getMaxLimitForRole(userRole)
  return Math.min(limit ?? DEFAULT_LIMIT, maxLimit)
}

export function needsElevatedLimitRole(limit: number | undefined): boolean {
  return limit !== undefined && limit > PUBLIC_MAX_LIMIT
}
