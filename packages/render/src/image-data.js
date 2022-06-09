// Uint8ClampedArray



// const warpedTile = Buffer.alloc(TILE_SIZE * TILE_SIZE * CHANNELS)

// // TODO: use spherical mercator instead of lat/lon
// const longitudeFrom = extent[0]
// const latitudeFrom = extent[1]

// const longitudeDiff = extent[2] - extent[0]
// const latitudeDiff = extent[3] - extent[1]

// const longitudeStep = longitudeDiff / TILE_SIZE
// const latitudeStep = latitudeDiff / TILE_SIZE



// for (let x = 0; x < TILE_SIZE; x++) {
//     for (let y = 0; y < TILE_SIZE; y++) {
//       const world = [
//         longitudeFrom + y * longitudeStep,
//         latitudeFrom + x * latitudeStep
//       ]

//       const [pixelX, pixelY] = toImage(transformer, world)

//       // TODO: improve efficiency
//       // TODO: fix strange repeating error,
//       //  remove pointInPolygon check and fix first
//       const inside = pointInPolygon([pixelX, pixelY], pixelMask)
//       if (!inside) {
//         continue
//       }

//       let tileIndex
//       let tile
//       let tileXMin
//       let tileYMin
//       let foundTile = false
//       for (tileIndex in iiifTiles) {
//         tile = iiifTiles[tileIndex]
//         tileXMin = tile.x * tile.originalWidth
//         tileYMin = tile.y * tile.originalHeight

//         if (pixelX >= tileXMin && pixelX <= tileXMin + tile.originalWidth &&
//           pixelY >= tileYMin && pixelY <= tileYMin + tile.originalHeight) {
//           foundTile = true
//           break
//         }
//       }

//       if (tileIndex !== undefined && foundTile) {
//         const buffer = buffers[tileIndex]

//         if (buffer) {
//           const pixelTileX = (pixelX - tileXMin) / tile.scaleFactor
//           const pixelTileY = (pixelY - tileYMin) / tile.scaleFactor

//           const warpedBufferIndex = (x * TILE_SIZE + y) * CHANNELS
//           const bufferIndex = (Math.floor(pixelTileY) * buffer.info.width + Math.floor(pixelTileX)) * buffer.info.channels

//           for (let color = 0; color < CHANNELS; color++) {
//             // TODO: don't just copy single pixel, do proper image interpolating
//             warpedTile[warpedBufferIndex + color] = buffer.data[bufferIndex + color]
//           }
//         }
//       }
//     }
//   }
