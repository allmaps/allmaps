export function hashToId (hash, length = 16) {
  // exclude chars: Il0oO=/+ and return only the first length
  return hash
    // eslint-disable-next-line no-useless-escape
    .replace(/[Il0oO=\/\+]/g, '')
    .substring(0, length)
}

export function serialize (obj) {
  if (Array.isArray(obj)) {
    return JSON.stringify(obj.map((i) => serialize(i)))
  } else if (typeof obj === 'string') {
    return `"${obj}"`
  } else if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj)
      .sort()
      .map(k => `${k}:${serialize(obj[k])}`)
      .join('|')
  }

  return obj
}

export function randomString () {
  return String(Math.random())
}
