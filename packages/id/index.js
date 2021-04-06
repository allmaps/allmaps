const crypto = require('crypto')

// generate a hash of a specific length
module.exports = function perma (url, length = 16) {
  // exclude chars: Il0oO=/+ and return only the first len

  const hash = crypto.createHash('sha512')
    .update(url.toString())
    .digest('base64')
    // eslint-disable-next-line no-useless-escape
    .replace(/[Il0oO=\/\+]/g, '')

  return hash.substring(0, length)
}
