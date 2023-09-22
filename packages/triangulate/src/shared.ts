import { computeBbox } from '@allmaps/stdlib'
import type { Bbox, Line, Ring, Position } from '@allmaps/types'

function computeLineDistance(line: Line): number {
  return Math.sqrt(
    Math.pow(line[1][0] - line[0][0], 2) + Math.pow(line[1][1] - line[0][1], 2)
  )
}

function computeLineAngle(line: Line): number {
  // line = [[x0, y0], [x1, y1]]
  // return angle of line (in radians, signed)
  return Math.atan2(line[1][1] - line[0][1], line[1][0] - line[0][0])
}

function computeNextPoint(
  point: Position,
  distance: number,
  angle: number
): Position {
  return [
    point[0] + Math.cos(angle) * distance,
    point[1] + Math.sin(angle) * distance
  ]
}

function makePointsOnLine(line: Line, distance: number): Position[] {
  let currentPoint = line[0]
  const result = [currentPoint]

  while (computeLineDistance([currentPoint, line[1]]) > distance) {
    const nextPoint = computeNextPoint(
      currentPoint,
      distance,
      computeLineAngle(line)
    )
    result.push(nextPoint)
    currentPoint = nextPoint
  }
  // note: the last nextpoint, which is also line[1], is not pushed
  return result
}

export function makePointsOnPolygon(polygon: Ring, distance: number) {
  // close polygon
  polygon = [...polygon, polygon[0]]

  let result: Ring = []
  for (let i = 0; i < polygon.length - 1; i++) {
    result = result.concat(
      makePointsOnLine([polygon[i], polygon[i + 1]], distance)
    )
  }
  return result
}

export function createGrid(polygon: Ring, gridSize: number): Position[] {
  const grid = []
  const bbox: Bbox = computeBbox(polygon)
  for (let x = bbox[0] + gridSize, i = 0; x <= bbox[2]; i++, x += gridSize) {
    for (let y = bbox[1] + gridSize, j = 0; y <= bbox[3]; j++, y += gridSize) {
      grid.push([x, y] as Position)
    }
  }
  return grid
}
