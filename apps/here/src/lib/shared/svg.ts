import type { Size, Point } from '@allmaps/types'

export function getRelativeSizedRectangle(
  resourceSize: Size,
  size: number
): Size {
  let svgWidth = size
  let svgHeight = size

  if (resourceSize[0] > resourceSize[1]) {
    svgHeight = (svgWidth / resourceSize[0]) * resourceSize[1]
  } else {
    svgWidth = (svgHeight / resourceSize[1]) * resourceSize[0]
  }

  return [svgWidth, svgHeight]
}

export function svgCoordinates(
  resourceSize: Size,
  svgSize: Size,
  resourcePositionCoordinates: Point
): Point {
  return [
    (resourcePositionCoordinates[0] / resourceSize[0]) * svgSize[0],
    (resourcePositionCoordinates[1] / resourceSize[1]) * svgSize[1]
  ]
}
