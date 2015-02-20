var crypto = require('crypto');
// generate a hash of a specific length
module.exports = function perma(url, length) {
  var len = length || 5;
  len = (length === "full") ? 88 : len;
  var hash = crypto.createHash('sha512');
  hash.update(url.toString()); // exclude chars: Il0oO=/+ and return only the first len
  return hash.digest('base64').replace(/[Il0oO=\/\+]/g,'').substring(0, len);
}
