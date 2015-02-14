var perma = require('../index');
var test  = require('tape');

test("Create random string of 4 characters", function(t) {
  var str = perma(4);
  t.equal(str.length, 4, "Worked as expected");
  t.end();
});

test("Confirm string characters are in Allowed chars", function(t) {
  charSet = "ABCDEFGHJKLMNPQRTUVWXYZabcdefghmnptuvwxyz2345678923456789";
  var str = perma(50);
  console.log("Our Random string is: " + str);
  str.split('').map(function(char) {
    t.true(charSet.indexOf(char) > -1, char + " is in charSet: "+ charSet);
  });
  t.end();
});
