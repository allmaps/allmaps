import { sha1 } from 'js-sha1'

import { serialize } from './checksum.js'

const DEFAULT_LENGTH = 16

/**
 * Computes SHA-1 hash of input string.
 *
 * @param Input string.
 * @returns SHA-1 hash of `str`.
 */
function generateHash(str: string): string {
  return sha1.hex(str)
}

/**
 * Generates an ID from a string using the SHA-1 algorithm. Given the same input, the ID will always be the same.
 *
 * @param str - Input string
 * @param length - Length of returned hash. The maximum length of the hash is 40 characters. The default length is 16.
 * @returns First `length` characters of the SHA-1 hash of `str`.
 */
export function generateId(str: string, length = DEFAULT_LENGTH) {
  const hash = generateHash(String(str))
  return hash.slice(0, length)
}

/**
 * Generates a random ID.
 *
 * @param length - Length of returned hash. The maximum length of the hash is 40 characters.
 * @returns First `length` characters of the SHA-1 hash of a random UUID.
 */
export function generateRandomId(length: number = DEFAULT_LENGTH) {
  const uuid = crypto.randomUUID()
  const id = generateId(uuid, length)
  return id
}

/**
 * Generates a checksum of a JSON object.
 *
 * @param obj - JSON object.
 * @param length - Length of returned hash. The maximum length of the hash is 40 characters.
 * @returns First `length` characters of the SHA-1 hash of sorted and serialized version of `obj`.
 */
export function generateChecksum(
  obj: unknown,
  length: number = DEFAULT_LENGTH
) {
  const checksum = generateId(serialize(obj), length)
  return checksum
}
