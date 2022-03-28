import serialize from './checksum.js'

async function generateHash(str: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(
    'SHA-512',
    new TextEncoder().encode(str)
  )
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((byte: number) => byte.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export async function generateId(str: string, length: number = 16): Promise<string> {
  const hash = await generateHash(String(str))
  return hash.slice(0, length)
}

export async function generateRandomId(length?: number): Promise<string> {
  const uuid = crypto.randomUUID()
  const id = await generateId(uuid, length)
  return id
}

export async function generateChecksum(obj: {}, length?: number): Promise<string> {
  const checksum = await generateId(serialize(obj), length)
  return checksum
}
