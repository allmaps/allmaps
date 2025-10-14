import { sha1 } from 'js-sha1'

// Synchronous ID generation
// The same functions form @allmaps/id are async,
// But Terra Draw needs a sync version.

export function generateId(str: string) {
  return sha1.hex(str).slice(0, 16)
}

export function generateRandomId() {
  return generateId(crypto.randomUUID())
}
