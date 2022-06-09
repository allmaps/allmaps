# @allmaps/render

hoe werkt het?

- nieuwe map extent (onMapMove)
    - kijken welke tiles: iiifTilesForMapExtent (ook in Web Worker)
    - Renderen met momenteel beschikbare tiles (ook in Web Worker?)
    - Downloaden nieuwe tiles (in Web Worker, gebruik Cache API)


buff = new SharedArrayBuffer(1);
var   arr = new Int8Array(buff);
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SharedArrayBuffer

tiles:

- Input: meerdere Maps, in array, geordend.
    1. bereken geojson met @allmaps/transform
    2. bereken overlap? of depth buffer! hoe moet dat in WebGl? gebruik order polygonen uit input
    3. gebruik earcut?
    4. maak 2d index?!


- iiifTilesForMapExtent

textures:

- packTiles met potpack

imageData

- Render warped map in Int8Array
    - input: array of images/Int8Arrays
    - output: Int8Array

WebGL


## Depend on @allmaps/render

- Tile Server
  -
https://developer.mozilla.org/en-US/docs/Web/API/Response/Response
cache met redis?
of cache van Cloudflare Worker

- OpenLayers plugin

- Leaflet plugin

- Canvas