import type { LoginUser } from './types.js'

export function displayName(user?: LoginUser | null) {
  const name = user?.name?.trim()
  return name && !/^[^\s@]+@[^\s@]+$/.test(name) ? name : undefined
}
