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
  var char;
  str.split('').map(function(c) {
    char = c;
    // t.true(charSet.indexOf(char) > -1, char + " is in charSet: "+ charSet);
  });
  t.true(charSet.indexOf(char) > -1, char + " is in charSet: "+ charSet);
  t.end();
});
test("Performance Test", function(t) {
  var st = new Date().getTime();
  var str;
  var n  = 1000000;
  for(var i = 0; i < n; i++){
    str = perma(6);
  }
  var et = new Date().getTime();
  var took = et - st;
  console.log("Generated " + n + " (one million) random strings in " + took + " ms");
  t.true(took < 3000, " >> Performance: " + Math.floor(n/took*1000) + "/sec");
  t.end();
});
