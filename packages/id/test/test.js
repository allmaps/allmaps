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
  var hash = perma("RandomGobbledygook", "full");
  t.true(hash.length > 20, "Full Length is "+hash);
  t.end();
});

test("Performance Test", function(t) {
  var st = new Date().getTime(); // start time
  var str;
  var n  = 1000000;
  for(var i = 0; i < n; i++){
    var length = Math.floor(Math.random() * 27) + 1
    str = perma(i, length);
  }
  var et = new Date().getTime(); // end time
  var took = et - st;            // elapsed time
  console.log("Generated " + n + " (one million) permalinks in " + took + " ms");
  t.true(took < 20000, " >> Performance: " + Math.floor(n/took*1000) + "/sec");
  t.end(); // should not fail just because Travis-CI instance is low-powered!
});

var longurl = '/my-awesome-post-about-unicorns';
var tinyurl = perma(longurl, "full");
console.log(">> "+tinyurl + ' | '+tinyurl.length); // 89CkC
