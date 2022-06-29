// import * as fs from 'fs'
// import fetch from 'node-fetch'

// import { IIIF } from './classes/iiif.js'
// import { Manifest, FetchedEvent } from './classes/manifest.js'

// const filename1 = './test/input/zlb-15453873-00000001.image.2.json'
// const filename2 = './test/input/yale-15826830.presentation.2.json'
// const filename3 = './test/input/manifest.2.ocls-cdm21033-2175.json'
// const filename4 = './test/input/nhm-vfactor-L014163620.image.3.json'
// const filename5 = './test/input/polona.pl-NTU5NTE4OTg.presentation.3.json'

// const iiifData1 = JSON.parse(fs.readFileSync(filename1, 'utf-8'))
// const iiifData2 = JSON.parse(fs.readFileSync(filename2, 'utf-8'))
// const iiifData3 = JSON.parse(fs.readFileSync(filename3, 'utf-8'))
// const iiifData4 = JSON.parse(fs.readFileSync(filename4, 'utf-8'))
// const iiifData5 = JSON.parse(fs.readFileSync(filename5, 'utf-8'))

// const iiif1 = IIIF.parse(iiifData1)
// const iiif2 = IIIF.parse(iiifData2)
// const iiif3 = IIIF.parse(iiifData3)
// const iiif4 = IIIF.parse(iiifData4)
// const iiif5 = IIIF.parse(iiifData5)

// // console.log(iiif1.uri, iiif3.uri)

// function fetchJson(url: string): Promise<any> {
//   return fetch(url).then((response) => response.json())
// }

// // async function run() {
// //   console.log('run')

// //   if (iiif3 instanceof Manifest) {
// //     // const a = [...iiif3.fetchNextImages(fetchJson)]
// //     // console.log(a)

// //     console.log(iiif3.images)

// //     for await (const image of iiif3.fetchNextImages(fetchJson)) {
// //       console.log('vv')
// //     }

// //     for await (const image of iiif3.fetchNextImages(fetchJson)) {
// //       console.log('WWW')
// //     }

// //     console.log(iiif3.images)
// //   }
// // }

// async function run() {
//   if (iiif3 instanceof Manifest) {
//     iiif3.addEventListener('fetched', ((event: FetchedEvent) => {
//       console.log('Fetched:', event.image.uri)
//     }) as EventListener)

//     await iiif3.fetchNextImages2(fetchJson)

//     console.log(iiif3.images)
//   }
// }

// // console.log(iiif1)
// // console.log(iiif2)
// console.log(iiif3)
// // console.log(iiif4)
// // console.log(iiif5)

// run()
// // console.log(iiifData)
