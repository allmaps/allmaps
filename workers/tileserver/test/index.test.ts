// function comparePngs(png1, png2) {
//   const img1 = new Uint8Array(toRGBA8(decodePng(png1))[0])
//   const img2 = new Uint8Array(toRGBA8(decodePng(png2))[0])

//   const numDiffPixels = pixelmatch(img1, img2, null, 256, 256, {
//     threshold: 0.1
//   })

//   return numDiffPixels
// }

// test('Responds with name', async () => {
//   const response = await request(baseUrl)
//   expect(await response.json()).toStrictEqual({ name: 'Allmaps Tile Server' })
// })

// TODO: use local IIIF server to test tileserver

// test('responds with correct PNG', async () => {
//   const url = `${baseUrl}/maps/a38b4ed7ea01a36a/16/33583/21671.png`
//   const response = await request(url)

//   const workerTile = await response.arrayBuffer()
//   const localTile = fs.readFileSync(
//     path.join(__dirname, './data/tiles/a38b4ed7ea01a36a-16-33583-21671.png'),
//     null
//   ).buffer

//   const numDiffPixels = comparePngs(workerTile, localTile)

//   expect(numDiffPixels).toBe(0)
// })
