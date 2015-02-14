// generate a random string of characters of length len
function randomString(len) {
  charSet = "ABCDEFGHJKLMNPQRTUVWXYZabcdefghmnptuvwxyz2345678923456789";
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}

// console.log(randomString(4));

module.exports = randomString;

// for(var i = 1; i < 7; i++){
//   console.log(i + " " + Math.pow(57, i))
// }
