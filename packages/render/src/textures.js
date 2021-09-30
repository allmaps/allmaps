import potpack from 'potpack'

export function packTiles (iiifTiles) {
  const tilesToPack = iiifTiles
    .map((tile) => ({
      w: tile.width,
      h: tile.height
    }))

  const { w: textureWidth, h: textureHeight } = potpack(tilesToPack)

  return {
    textureWidth,
    textureHeight,
    tiles: tilesToPack.map((tile, index) => ({
      ...iiifTiles[index],
      textureX: tile.x,
      textureY: tile.y
    }))
  }
}
