import serialize from './checksum.js'

/**
 * Computes SHA-1 hash of input string.
 *
 * @param {string} str - Input string.
 * @returns {string} SHA-1 hash of `str`.
 */
async function generateHash(str: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(str)
  )
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray
    .map((byte: number) => byte.toString(16).padStart(2, '0'))
    .join('')
  return hashHex
}

/**
 * Generates an ID from a string using the SHA-1 algorithm. Given the same input, the ID will always be the same.
 *
 * @param {string} str - Input string.
 * @param {number} [length] - Length of returned hash. The maximum length of the hash is 40 characters. The default length is 16.
 * @returns {Promise<string>} First `length` characters of the SHA-1 hash of `str`.
 */
export async function generateId(str: string, length = 16): Promise<string> {
  const hash = await generateHash(String(str))
  return hash.slice(0, length)
}

/**
 * Generates a random ID.
 *
 * @async
 * @param {number} [length] - Length of returned hash. The maximum length of the hash is 40 characters.
 * @returns {Promise<string>} First `length` characters of the SHA-1 hash of a random UUID.
 */
export async function generateRandomId(length?: number): Promise<string> {
  const uuid = crypto.randomUUID()
  const id = await generateId(uuid, length)
  return id
}

/**
 * Generates a checksum of a JSON object.
 *
 * @async
 * @param {Object} obj - JSON object.
 * @param {number} [length] Length of returned hash. The maximum length of the hash is 40 characters.
 * @returns {Promise<string>} First `length` characters of the SHA-1 hash of sorted and serialized version of `obj`.
 */
export async function generateChecksum(
  obj: unknown,
  length?: number
): Promise<string> {
  const checksum = await generateId(serialize(obj), length)
  return checksum
}
