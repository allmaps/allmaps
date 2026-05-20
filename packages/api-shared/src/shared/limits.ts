export const DEFAULT_LIMIT = 100

export const PUBLIC_MAX_LIMIT = 100
export const USER_MAX_LIMIT = 250
export const PAID_ORGANIZATION_MEMBER_MAX_LIMIT = 500
export const ADMIN_MAX_LIMIT = 500

export type UserRole = 'public' | 'user' | 'paidOrganizationMember' | 'admin'

const MAX_LIMITS: Record<UserRole, number> = {
  public: PUBLIC_MAX_LIMIT,
  user: USER_MAX_LIMIT,
  admin: ADMIN_MAX_LIMIT,
  paidOrganizationMember: PAID_ORGANIZATION_MEMBER_MAX_LIMIT
}

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
