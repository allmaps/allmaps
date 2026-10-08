import type { UserRole } from './tiers.js'

type SessionUser = {
  id: string
  role?: string | null
}

export function getUserLimitRole(
  user: SessionUser | null | undefined
): UserRole {
  if (!user?.id) {
    return 'public'
  }

  if (user.role === 'admin' || user.role === 'collaborator') {
    return user.role
  }

  return 'user'
}

export function canImportIiif(user: SessionUser | null | undefined): boolean {
  return Boolean(
    user?.id && (user.role === 'admin' || user.role === 'collaborator')
  )
}
