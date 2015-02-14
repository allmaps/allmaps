# perma

Generate perma-links from your long urls.

## Why?

Most websites will never have more than a few dozen links,


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

## How

```js
var upper  = "A,B,C,D,E,F,G,H,J,K,L,M,N,P,Q,R,T,U,V,W,X,Y,Z,",
    number = "2,3,4,5,6,7,8,9,2,3,4,5,6,7,8,9",
    lower  = "a,b,c,d,e,f,g,h,m,n,p,t,u,v,w,x,y,z";

```

57 characters.
if each position in a string can be taken by one of these characters
then there are
[57 to the power of 4](http://www.wolframalpha.com/input/?i=57+to+the+power+of+4)
4-character strings. or **10.5 Million**
