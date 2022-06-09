
// import { loadImage, MAX_TEXTURE_SIZE, MAX_TILES } from './lib/textures.js'
// import { createDrawCommand } from './lib/regl.js'

// import { iiifTilesForMapExtent } from '@allmaps/render'
// import { createTransformer } from '@allmaps/transform'
// import { getIiifTile, getImageUrl } from '@allmaps/iiif-parser'


//     const regl = createREGL({
//       extensions: ['OES_texture_float', 'WEBGL_depth_texture'],
//       canvas,
//       attributes: {
//         antialias: true,
//         preserveDrawingBuffer: true
//       }
//     })

//     this.visible = true

//     this.tiles = new Map()
//     this.textureSize = [0, 0]
//     this.texture = regl.texture()
//     this.scaleFactors = regl.texture()
//     this.tilePositions = regl.texture()
//     this.imagePositions = regl.texture()

//     this.canvas = canvas
//     this.container = container

//     this.regl = regl

//     this.update(options.parsedImage, options.georeferencedMap)
//   }

//   update (parsedImage, georeferencedMap) {
//     if (!parsedImage || !georeferencedMap) {
//       return
//     }

//     this.parsedImage = parsedImage
//     this.georeferencedMap = georeferencedMap

//     if (this.georeferencedMap && this.georeferencedMap.gcps) {
//       try {
//         this.transformArgs = createTransformer(this.georeferencedMap.gcps)
//       } catch (err) {
//         console.error(err)
//       }
//     }
//   }

//   fillArray (length, pixel = [0, 0, 0, 0]) {
//     return Array.from({length}, () => pixel)
//   }

//   updateTexture () {
//     let tiles = Array.from(this.tiles.values())
//       .filter((tile) => !tile.loading)
//       .map((tile) => ({
//         ...tile,
//         w: tile.width,
//         h: tile.height
//       }))

//     this.tileCount = tiles.length

//     if (this.tileCount === 0) {
//       return
//     } else if (this.tileCount > MAX_TILES) {
//       throw new Error('too many tiles')
//     }

//     this.scaleFactors({
//       width: this.tileCount,
//       height: 1,
//       data: [
//         tiles.map((tile) => [tile.scaleFactor, 0, 0])
//       ]
//     })

//     // Potpack modifies the tiles array and overwrites the x, y row/column
//     // values with the texture position in pixel values
//     const tileRowColumns = tiles.map(({x, y}) => ({x, y}))
//     const {w: textureWidth, h: textureHeight} = potpack(tiles)

//     tiles = tiles.map((tile, index) => ({
//       ...tile,
//       x: tileRowColumns[index].x,
//       y: tileRowColumns[index].y,
//       textureX: tile.x,
//       textureY: tile.y
//     }))

//     if (Math.max(textureWidth, textureHeight) > MAX_TEXTURE_SIZE) {
//       throw new Error('tile texture too large')
//     }

//     this.texture.resize(textureWidth, textureHeight)
//     tiles.forEach((tile) => {
//       const canvas = document.createElement('canvas')
//       const context = canvas.getContext('2d')

//       canvas.width = tile.width
//       canvas.height = tile.height

//       // TODO: use tile.mapId
//       // if (this.warpedMap && this.warpedMap.pixelMask) {
//       //   const pixelMask = this.warpedMap.pixelMask
//       //   context.save()
//       //   context.beginPath()

//       //   const translateCoordinate = ([x, y]) => [
//       //     (x - tile.regionX) / tile.scaleFactor,
//       //     (y - tile.regionY) / tile.scaleFactor]

//       //   context.moveTo(...translateCoordinate(pixelMask[0]))
//       //   pixelMask.slice(1).forEach((point) => {
//       //     context.lineTo(...translateCoordinate(point))
//       //   })

//       //   context.closePath()
//       //   context.clip()
//       // }

//       context.drawImage(tile.tileImage, 0, 0)
//       this.texture.subimage(canvas, tile.textureX, tile.textureY)
//     })

//     this.textureSize = [textureWidth, textureHeight]

//     const tilePositions = tiles.map((tile) => ([
//       tile.textureX / textureWidth,
//       tile.textureY / textureHeight,
//       0
//     ]))

//     const imagePositions = tiles.map((tile) => ([
//       tile.region.x / this.parsedImage.width,
//       tile.region.y / this.parsedImage.height,
//       tile.region.width / this.parsedImage.width,
//       tile.region.height / this.parsedImage.height
//     ]))

//     this.tilePositions({
//       width: this.tileCount,
//       height: 1,
//       format: 'rgb',
//       type: 'float',
//       data: [
//         tilePositions
//       ]
//     })

//     this.imagePositions({
//       width: this.tileCount,
//       height: 1,
//       format: 'rgba',
//       type: 'float',
//       data: [
//         imagePositions
//       ]
//     })
//   }

//   async loadTile (tile) {
//     const { region, size } = tile
//     const url = getImageUrl(this.parsedImage, { region, size })

//     let tileImage

//     try {
//       tileImage = await loadImage(url)
//     } catch (err) {
//       this.dispatchEvent('tile-load-error')
//     }

//     if (!tileImage) {
//       return
//     }

//     this.tiles.set(tile.id, {
//       loading: false,
//       tileImage,
//       ...tile
//     })

//     this.updateTexture()
//     this.getSource().refresh()
//   }

//   destroy () {
//     if (this.texture) {
//       this.texture.destroy()
//     }

//     if (this.imagePositions) {
//       this.imagePositions.destroy()
//     }

//     if (this.tilePositions) {
//       this.tilePositions.destroy()
//     }

//     if (this.scaleFactors) {
//       this.scaleFactors.destroy()
//     }

//     if (this.regl) {
//       this.regl.destroy()
//     }
//   }

//   findIiifTiles (frameState) {
//     if (!this.georeferencedMap) {
//       return
//     }

//     const transformedExtent = transformExtent(frameState.extent, 'EPSG:3857', 'EPSG:4326')

//     // TODO: take frameState.pixelRatio into account!?
//     // const frameStateExtent = [
//     //   frameState.size[0] * frameState.pixelRatio,
//     //   frameState.size[1] * frameState.pixelRatio
//     // ]

//     const frameStateExtent = frameState.size
//     const iiifTiles = iiifTilesForMapExtent(this.transformArgs, this.parsedImage, frameStateExtent, transformedExtent)

//     console.log(this.parsedImage, frameStateExtent, iiifTiles)

//     return iiifTiles.map((tile) => ({
//       id: `${tile.scaleFactor}/${tile.x}/${tile.y}`,
//       ...tile,
//       ...getIiifTile(this.parsedImage, tile, tile.x, tile.y)
//     }))
//   }

//   async updateTiles (iiifTiles) {
//     const newTiles = new Map(iiifTiles.map((tile) => ([
//       tile.id,
//       tile
//     ])))

//     let tilesAdded = Array.from(newTiles.keys())
//       .filter((id) => !this.tiles.has(id))

//     let tilesRemoved = Array.from(this.tiles.keys())
//       .filter((id) => !newTiles.has(id))

//     if (tilesAdded.length) {
//       tilesAdded.forEach((id) => {
//         const tile = newTiles.get(id)

//         this.tiles.set(id, {
//           loading: true,
//           ...tile
//         })

//         this.loadTile(tile)
//       })
//     }

//     if (tilesRemoved.length) {
//       tilesRemoved.forEach((id) => {
//         if (this.tiles.has(id)) {
//           this.tiles.delete(id)
//         }
//       })

//       this.updateTexture()
//     }
//   }

//   toLatLon (point) {
//     return new Point(point)
//       .transform('EPSG:3857', 'EPSG:4326')
//       .getCoordinates()
//   }

//   getCanvasSize () {
//     const pixelRatio = Math.max(2, window.devicePixelRatio)
//     const canvasWidth = Math.floor(this.container.clientWidth * pixelRatio)
//     const canvasHeight = Math.floor(this.container.clientHeight * pixelRatio)
//     return [canvasWidth, canvasHeight]
//   }

//   setVisible (visible) {
//     this.visible = visible

//     const source = this.getSource()
//     if (source) {
//       source.refresh()
//     }
//   }

//   updateCanvasSize ([width, height]) {
//     this.canvas.width = width
//     this.canvas.height = height
//   }

//   render (frameState) {
//     if (!this.parsedImage || !this.georeferencedMap) {
//       return
//     }

//     const canvasSize = this.getCanvasSize()

//     const iiifTiles = this.findIiifTiles(frameState)

//     if (iiifTiles.length === 0) {
//       return
//     }

//     this.updateTiles(iiifTiles)

//     const tileWidth = iiifTiles[0].width
//     const tileHeight = iiifTiles[0].height

//     const extent = frameState.extent
//     const southWest = [extent[0], extent[1]]
//     const northEast = [extent[2], extent[3]]

//     const props = {
//       southWest: this.toLatLon(southWest),
//       northEast: this.toLatLon(northEast),
//       tileCount: this.tileCount || 0,
//       textureSize: this.textureSize,
//       visible: this.visible
//     }

//     let resized = false

//     if (!this.canvasSize || this.canvasSize[0] !== canvasSize[0] || this.canvasSize[1] !== canvasSize[1]) {
//       this.updateCanvasSize(canvasSize)
//       resized = true
//     }

//     const imageSize = [this.parsedImage.width, this.parsedImage.height]
//     const tileSize = [tileWidth, tileHeight]

//     if (this.transformArgs && resized) {
//       this.draw = createDrawCommand(
//         this.regl,
//         MAX_TILES,
//         canvasSize, imageSize, tileSize,
//         this.texture, this.imagePositions, this.tilePositions, this.scaleFactors,
//         this.transformArgs)
//     }

//     if (this.draw) {
//       this.draw(props)
//     }

//     this.canvasSize = canvasSize

//     return this.container
//   }
// }
