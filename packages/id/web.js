/* global crypto, TextEncoder, btoa */

import { hashToId, serialize, randomString } from './src/id.js'

function sha512 (str) {
  return crypto.subtle.digest('SHA-512', new TextEncoder('utf-8').encode(str))
}

function toBase64 (buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
}

async function createBase64Hash (str) {
  const hash = await sha512(String(str))
    .then(toBase64)
  return hash
}

export async function createId (str, length) {
  const hash = await createBase64Hash(str)
  return hashToId(hash, length)
}

export async function createRandomId (length) {
  const id = await createId(randomString(), length)
  return id
}

export async function createChecksum (obj, length) {
  const hash = await createBase64Hash(serialize(obj))
  return hashToId(hash, length)
}
