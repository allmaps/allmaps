export function pointInPolygon (point, polygon) {
  // From:
  //  https://stackoverflow.com/questions/22521982/check-if-point-is-inside-a-polygon
  // Ray-casting algorithm based on:
  //  https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html

  if (!polygon) {
    return true
  }

  let [x, y] = point

  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let [xi, yi] = polygon[i]
    let [xj, yj] = polygon[j]

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)

    if (intersect) {
      inside = !inside
    }
  }

  return inside
}

export function xyzTileToGeoJSON ({z, x, y}) {
  const topLeft = xyzTileTopLeft({z, x, y})
  const bottomRight = xyzTileBottomRight({z, x, y})

  return {
    type: 'Polygon',
    coordinates: [
      [
        topLeft,
        [topLeft[0], bottomRight[1]],
        bottomRight,
        [bottomRight[0], topLeft[1]],
        topLeft
      ]
    ]
  }
}

export function xyzTileToGeoExtent ({z, x, y}) {
  const topLeft = xyzTileTopLeft({z, x, y})
  const bottomRight = xyzTileBottomRight({z, x, y})

  return [
    ...topLeft,
    ...bottomRight
  ]
}

function xyzTileTopLeft ({z, x, y}) {
  return [
    tile2long({x, z}),
    tile2lat({y, z})
  ]
}

function xyzTileBottomRight ({z, x, y}) {
  return [
    tile2long({x: x + 1, z}),
    tile2lat({y: y + 1, z})
  ]
}

// From:
//   https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function tile2long ({x, z}) {
  return (x / Math.pow(2, z) * 360 - 180)
}

function tile2lat ({y, z}) {
  const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
  return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))))
}
