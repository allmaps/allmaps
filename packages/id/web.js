function sha512 (str) {
  return crypto.subtle.digest('SHA-512', new TextEncoder('utf-8').encode(str))
}

function toBase64 (buffer) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer)))
}

export default async function generateId (str) {
  const hash = await sha512(str)
    .then(toBase64)

  return hash
    .replace(/[Il0oO=\/\+]/g, '')
    .substring(0, 16)
}
