import { parse, Node, ElementNode, RootNode } from 'svg-parser'

import type { Map } from '@allmaps/annotation'

type ViewBox = [number, number, number, number]

type Coord = [number, number]

type Line = {
  type: 'line'
  coordinates: [Coord, Coord]
}

type PolyLine = {
  type: 'polyline'
  coordinates: Coord[]
}

type Polygon = {
  type: 'polygon'
  coordinates: Coord[]
}

type Rect = {
  type: 'rect'
  coordinates: Coord[]
}

type Geometry = Line | PolyLine | Polygon | Rect

function getNodeNumberProperty(node: ElementNode, prop: string): number {
  const value = node?.properties?.[prop]
  return Number(value) || 0
}

function pointsToCoords(node: ElementNode): Coord[] {
  const points = node?.properties?.points

  if (points) {
    return String(points)
      .trim()
      .split(/\s+/)
      .map((coordStr) => {
        const coord = coordStr.split(',').map((numberStr) => Number(numberStr))

        return [coord[0], coord[1]]
      })
  }

  return []
}

function getGeometry(node: ElementNode): Geometry | undefined {
  const tag = node?.tagName?.toLowerCase()

  if (tag === 'line') {
    return {
      type: 'line',
      coordinates: [
        [getNodeNumberProperty(node, 'x1'), getNodeNumberProperty(node, 'y1')],
        [getNodeNumberProperty(node, 'x2'), getNodeNumberProperty(node, 'y2')]
      ]
    }
  } else if (tag === 'polyline') {
    return {
      type: 'polyline',
      coordinates: pointsToCoords(node)
    }
  } else if (tag === 'polygon') {
    return {
      type: 'polygon',
      coordinates: pointsToCoords(node)
    }
  } else if (tag === 'rect') {
    return {
      type: 'rect',
      coordinates: [
        [getNodeNumberProperty(node, 'x'), getNodeNumberProperty(node, 'y')],
        [
          getNodeNumberProperty(node, 'x') +
            getNodeNumberProperty(node, 'width'),
          getNodeNumberProperty(node, 'y')
        ],
        [
          getNodeNumberProperty(node, 'x') +
            getNodeNumberProperty(node, 'width'),
          getNodeNumberProperty(node, 'y') +
            getNodeNumberProperty(node, 'height')
        ],
        [
          getNodeNumberProperty(node, 'x'),
          getNodeNumberProperty(node, 'y') +
            getNodeNumberProperty(node, 'height')
        ],
        [getNodeNumberProperty(node, 'x'), getNodeNumberProperty(node, 'y')]
      ]
    }
  }
}

export function* geomEach(svg: string) {
  function* helper(
    node: Node | ElementNode | RootNode
  ): Generator<Node | ElementNode | RootNode, void, undefined> {
    if ('children' in node) {
      for (let childNode of node.children) {
        if (typeof childNode !== 'string') {
          yield* helper(childNode)
        }
      }
    }

    yield node
  }

  const parsedSvg = parse(svg)

  for (let node of helper(parsedSvg)) {
    if ('tagName' in node) {
      const geometry = getGeometry(node)
      if (geometry) {
        yield geometry
      }
    }
  }
}

function generateSvg(viewBox: ViewBox, contents: string) {
  return `<svg viewBox="${viewBox.join(
    ' '
  )}" xmlns="http://www.w3.org/2000/svg">
  ${contents}</svg>`
}

function pixelMapToPoints(pixelMask: [number, number][]): string {
  return pixelMask.map((coordinate) => coordinate.join(',')).join(' ')
}

function pixelMapToViewBox(pixelMask: [number, number][]): ViewBox {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (let [x, y] of pixelMask) {
    minX = Math.min(x, minX)
    minY = Math.min(y, minY)
    maxX = Math.max(x, maxX)
    maxY = Math.max(y, maxY)
  }

  return [minX, minY, maxX - minX, maxY - minY]
}

export function generatePixelMapSvg(maps: Map[]) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  const polygons = maps.map((map) => {
    const imageUri = map.image.uri
    const polygon = `<polygon data-image-uri="${encodeURIComponent(
      imageUri
    )}" fill="none" stroke="black" points="${pixelMapToPoints(
      map.pixelMask
    )}" />`

    const viewBox = pixelMapToViewBox(map.pixelMask)
    minX = Math.min(viewBox[0], minX)
    minY = Math.min(viewBox[1], minY)
    maxX = Math.max(viewBox[0] + viewBox[2], maxX)
    maxY = Math.max(viewBox[1] + viewBox[3], maxY)

    return polygon
  })

  return generateSvg(
    polygons.length ? [minX, minY, maxX - minX, maxY - minY] : [0, 0, 0, 0],
    polygons.join('\n')
  )
}
