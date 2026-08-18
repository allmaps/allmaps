export const ORGANIZATION_PLANS = [
  'contributor',
  'supporter',
  'innovator'
] as const

export type OrganizationPlan = (typeof ORGANIZATION_PLANS)[number]

export const ORGANIZATION_PLANS_WITH_ELEVATED_LIMITS =
  new Set<OrganizationPlan>(ORGANIZATION_PLANS)

export type UserRole = 'public' | 'user' | 'organizationPlanMember' | 'admin'

export const DEFAULT_LIMIT = 50

export const PUBLIC_MAX_LIMIT = 200
export const USER_MAX_LIMIT = 400
export const ORGANIZATION_PLAN_MEMBER_MAX_LIMIT = 600
export const ADMIN_MAX_LIMIT = 600

export const PUBLIC_MAX_PAGES = 5
export const USER_MAX_PAGES = 10
export const ORGANIZATION_PLAN_MEMBER_MAX_PAGES = undefined // no limit
export const ADMIN_MAX_PAGES = undefined // no limit

export const MAX_LIMITS: Record<UserRole, number> = {
  public: PUBLIC_MAX_LIMIT,
  user: USER_MAX_LIMIT,
  organizationPlanMember: ORGANIZATION_PLAN_MEMBER_MAX_LIMIT,
  admin: ADMIN_MAX_LIMIT
}

export function isOrganizationPlan(value: string): value is OrganizationPlan {
  return ORGANIZATION_PLANS.includes(value as OrganizationPlan)
}
