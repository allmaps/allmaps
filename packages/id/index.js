var crypto = require('crypto');
// generate a
function perma(url, length) {
  var len = length || 5;
  var hash = crypto.createHash('sha1');
  hash.update(url.toString()); // exclude chars: Il0oO=/+ and return only the first len
  return hash.digest('base64').replace(/[Il0oO=\/\+]/g,'').substring(0, len);
}

module.exports = perma;
