import { generateRandomId } from '$lib/shared/id.js'

export const idStrategy = {
  isValidId: (id: unknown) => typeof id === 'string' && id.length === 16,
  getId: () => generateRandomId()
}

export function ensureStringId(id: string | number | undefined): string {
  if (typeof id === 'string') {
    return id
  }

  throw new Error('ID is not a string')
}
