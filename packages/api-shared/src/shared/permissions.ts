import type { UserRole } from './tiers.js'

type SessionUser = {
  id: string
  role?: string | null
  isAnonymous?: boolean | null
}

export function isSignedInUser(user: SessionUser | null | undefined): boolean {
  return Boolean(user?.id && !user.isAnonymous)
}

export function isOrganizationManager(
  role: string | null | undefined
): boolean {
  return role === 'admin' || role === 'collaborator'
}

export function getUserLimitRole(
  user: SessionUser | null | undefined
): UserRole {
  if (!isSignedInUser(user)) return 'public'
  if (user?.role === 'admin' || user?.role === 'collaborator') return user.role
  return 'user'
}

export function canImportIiif(user: SessionUser | null | undefined): boolean {
  return isSignedInUser(user) && isOrganizationManager(user?.role)
}

export function getOrganizationPermissions(
  userRole: string | null | undefined,
  memberRole: string | null | undefined
) {
  const isAllmapsAdmin = userRole === 'admin'
  const canManageOrganizations = isOrganizationManager(userRole)
  const isOrganizationOwner = memberRole === 'owner'

  return {
    canView:
      canManageOrganizations || isOrganizationOwner || memberRole === 'member',
    canUpdate: canManageOrganizations || isOrganizationOwner,
    canManageMembers: canManageOrganizations || isOrganizationOwner,
    canAssignOwner: canManageOrganizations,
    canChangeSlug: canManageOrganizations,
    canChangePlan: isAllmapsAdmin,
    canChangeDomains: canManageOrganizations,
    canChangeDisplayCollections: canManageOrganizations,
    canDelete: isAllmapsAdmin
  }
}

export type OrganizationPermissions = ReturnType<
  typeof getOrganizationPermissions
>
