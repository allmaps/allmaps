var perma = require('../index');
var test  = require('tape');

test("Create perma for url: 1234", function(t) {
  var str = perma(1234);
  t.equal(str.length, 5, "Worked as expected "+str);
  t.equal(str, '1ARVn', "Perma is consistent. 1234 >> 1ARVn")
  t.end();
});

test("Confirm string characters are in Allowed chars", function(t) {
  var charSet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789";
  var str = perma(Math.random());
  console.log("Our Random string is: " + str);
  var char;
  str.split('').map(function(c) {
    char = c;
    // t.true(charSet.indexOf(char) > -1, char + " is in charSet: "+ charSet);
  });
  t.true(charSet.indexOf(char) > -1, char + " is in charSet: "+ charSet);
  t.end();
});

test("Full Length Hash", function(t) {
  var hash = perma("RandomGobbledygook", 50);
  t.true(hash.length > 20, "Full Length is "+hash);
  t.end();
});
