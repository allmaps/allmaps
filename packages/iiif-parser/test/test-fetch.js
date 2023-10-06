// import * as fs from 'fs'

// import { IIIF } from '../dist/index.js'
// import { Manifest, Collection } from '../dist/index.js'

// let filename0 = './test/input/collection.2.theberlage-river-maps.json'

// let iiifData0 = JSON.parse(fs.readFileSync(filename0, 'utf-8'))

// let iiif0 = IIIF.parse(iiifData0)

// function fetchJson(url) {
//   return fetch(url).then((response) => response.json())
// }

// async function run() {
//   console.dir(iiif0, { depth: null, colors: true })

//   if (iiif0 instanceof Collection) {
//     for await (const next of iiif0.fetchNext(fetchJson, {
//       maxDepth: 2,
//       fetchManifests: true,
//       fetchImages: true
//     })) {
//       iiif0 = iiif0
//       console.log(next.depth, next.item.uri)
//     }
//   }

//   console.dir(iiif0, { depth: null, colors: true })
// }

// run()
