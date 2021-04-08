import { hashToId, serialize, randomString } from './src/id.js'
import crypto from 'crypto'

function createBase64Hash (str) {
  return crypto.createHash('sha512')
    .update(str)
    .digest('base64')
}

export async function createId (str, length) {
  const hash = await createBase64Hash(String(str))
  return hashToId(hash, length)
}

export async function createRandomId (length) {
  const id = await createId(randomString(), length)
  return id
}

export async function createChecksum (obj, length) {
  const hash = createBase64Hash(serialize(obj))
  return hashToId(hash, length)
}
