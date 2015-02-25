# perma [![Build Status](https://travis-ci.org/nelsonic/perma.png?branch=master)](https://travis-ci.org/nelsonic/perma) [![Test Coverage][coverage-image]][coverage-url] [![Code Climate](https://codeclimate.com/github/nelsonic/perma.png)](https://codeclimate.com/github/nelsonic/perma) [![Dependencies](https://david-dm.org/nelsonic/perma.png?theme=shields.io)](https://david-dm.org/nelsonic/perma) [![NPM Version][npm-image]][npm-url]

![permalink logo](http://i.imgur.com/DTFtLb1.png)

Generate **permalinks** for your web project and
give your visitors ***short urls*** to ***share***!

## Usage

### Install

```
npm install perma --save
```

### Use in your Node Script

```js
var perma   = require('perma');
var longurl = '/my-awesome-post-about-unicorns';
var tinyurl = perma(longurl);
console.log(tinyurl); // bCvQY
```

## Why?

*Most* websites will never have more than a few dozen links,
some of those links will be way *too* long for mortals to type!
we want a way of shortening long links for sharing.

## What?

A permalink (portmanteau of permanent link) is a URL that points to a
specific web page, often a blog or forum entry which has passed from
the front page to the archives, or the result of a search in a database.
Because a permalink remains unchanged indefinitely, it is less susceptible
to [link rot](http://en.wikipedia.org/wiki/Link_rot).

### Background Reading

+ Wikipedia Permalink: http://en.wikipedia.org/wiki/Permalink
+ PURL: http://en.wikipedia.org/wiki/Persistent_uniform_resource_locator
+ A few alternatives:
http://stackoverflow.com/questions/1349404/generate-a-string-of-5-random-characters-in-javascript

## How?

We could just *hash* the url: e.g:

```js
var hash = require('crypto').createHash('sha1');
hash.update("/my-amazing-blog-post");
console.log(hash.digest('base64')); // ExhijlsFTXLyVpfFgD3NQVwAfxU=
```
But the resulting string is **28 characters** long (*longer* than the original _**20** char_ url!)  
If the length is the issue we can do what GitHub does with commit hashes in their UI (truncate them...):

Use *only* the ***first 6 characters*** of the hash:
```js
var hash = require('crypto').createHash('sha512');
hash.update("/my-amazing-blog-post").digest('base64');
console.log(hash.substring(0, 6)); // Exhijl
```

Getting the [**base64**](http://en.wikipedia.org/wiki/Base64) "digest"
of the url means we have a **64 character** population (potential characters):  
```sh
A, B, C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z
a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z
0, 1, 2, 3, 4, 5, 6, 7, 8, 9, +, /
```
Which means we can have
[64<sup>5</sup>](http://www.wolframalpha.com/input/?i=64+to+the+power+of+5)
= 1,073,741,824 or ***1 Billion*** *possible* (*short*) urls.
(way more than *most* websites will *ever* need!)

***However*** there are a few characters in that set which can be *confusing*
to people trying to *type* the url (*yes* people *still* do type urls!):

```
0 (zero) can look like O (capital o) in certain fonts (so o, 0 and O) should be excluded.
I (capital i) and l (lowercase L) look identical in chrome's default font. exclude.
+ and / both have a special meaning in urls so exclude these too.
```
If we exclude the (*potentially*) "*confusing*" characters from our alphabet,
we are left with ***57 characters***.  
if each position in a string can be taken by one of these characters
then there are
[57 <sup>5</sup>](http://www.wolframalpha.com/input/?i=57+to+the+power+of+5)
5-character strings. 601,692,057 or **601 Million**  
(still *more* than "*enough*" available strings)

## *Optional*

If you want to have *even* shorter urls you will need to have a
**Datastore** for links (to check for duplicates)  
(we recommend using **Redis** for *speed*, but you can use which ever Datastore
  your project *already* uses e.g. Postgres, MySQL, MongoDB, CouchDB etc.)

### Shorter ?

If you supply the **perma** method with a **length** parameter:
```js
var perma   = require('perma');
var longurl = '/my-awesome-post-about-kittens';
var length  = 3;
var tinyurl = perma(longurl, length);
console.log(tinyurl); // bCv
```

### Longer?

If you want *more* just ask for it! e.g:

```js
var perma   = require('perma');
var longurl = '/my-awesome-post-about-unicorns';
var length  = 70;
var hash = perma(longurl, length);
console.log(hash); // 3ZtP18Ctj3bFMLhZww3SWEEGf15sGXczhvKcqahrcfX85ekZj7qMrqeB314MK77fjxvXfk
```

## Practical Usage

Given that there are
[57 <sup>3</sup>](http://www.wolframalpha.com/input/?i=57+to+the+power+of+3)
 = 185,193 **185k** *possible* urls we can *easily* use **perma**
 as the basis for most websites, blogs or basic apps.

 + [ ] Create practical http server example


[npm-image]: https://img.shields.io/npm/v/perma.svg?style=flat
[npm-url]: https://npmjs.org/package/perma
[coverage-image]: https://codeclimate.com/github/nelsonic/perma/badges/coverage.svg?style=flat
[coverage-url]: https://codeclimate.com/github/nelsonic/perma?branch=master
