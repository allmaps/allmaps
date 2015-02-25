var perma = require('../index');
var test  = require('tape');

test("Performance Test", function(t) {
  var st = new Date().getTime(); // start time
  var str;
  var n  = 1000000;
  for(var i = 0; i < n; i++){
    // var length = Math.floor(Math.random() * 27) + 1
    str = perma(i,5);
  }
  var et = new Date().getTime(); // end time
  var took = et - st;            // elapsed time
  console.log("Generated " + n + " (one million) permalinks in " + took + " ms");
  t.true(took < 20000, " >> Performance: " + Math.floor(n/took*1000) + "/sec");
  t.end(); // should not fail just because Travis-CI instance is low-powered!
});

// var perma   = require('perma');
var longurl = '/my-awesome-post-about-unicorns';
var length  = 70;
var tinyurl = perma(longurl, length);
console.log(tinyurl); // bCvQYQafswBmQzTWTak
