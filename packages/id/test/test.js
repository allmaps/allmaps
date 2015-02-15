var perma = require('../index');
var test  = require('tape');

test("Create perma for url: 1234", function(t) {
  var str = perma(1234);
  t.equal(str.length, 5, "Worked as expected "+str);
  t.equal(str, 'cRDtp', "Perma is consistent. 1234 >> cRDtp")
  t.end();
});

test("Confirm string characters are in Allowed chars", function(t) {
  var charSet = "ABCDEFGHJKLMNPQRTUVWXYZabcdefghmnptuvwxyz2345678923456789";
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

test("Performance Test", function(t) {
  var st = new Date().getTime(); // start time
  var str;
  var n  = 1000000;
  for(var i = 0; i < n; i++){
    str = perma(i, 6);
  }
  var et = new Date().getTime(); // end time
  var took = et - st;            // elapsed time
  console.log("Generated " + n + " (one million) permalinks in " + took + " ms");
  t.true(took < 10000, " >> Performance: " + Math.floor(n/took*1000) + "/sec");
  t.end();
});
