import { parse, Node, ElementNode, RootNode } from 'svg-parser'

import { Transformer } from '@allmaps/transform'

import type {
  GeoJSONGeometry,
  OptionalTransformOptions
} from '@allmaps/transform'

import type { Map } from '@allmaps/annotation'

type Coord = [number, number]
type SVGAttributes = Record<string, string | number>

type Circle = {
  type: 'circle'
  attributes?: SVGAttributes
  coordinates: Coord
}

type Line = {
  type: 'line'
  attributes?: SVGAttributes
  coordinates: [Coord, Coord]
}

type PolyLine = {
  type: 'polyline'
  attributes?: SVGAttributes
  coordinates: Coord[]
}

type Polygon = {
  type: 'polygon'
  attributes?: SVGAttributes
  coordinates: Coord[]
}

type Rect = {
  type: 'rect'
  attributes?: SVGAttributes
  coordinates: Coord[]
}

export type GeometryElement = Circle | Line | PolyLine | Polygon | Rect

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

function coordsToPoints(coordinates: Coord[]): string {
  return coordinates.map((coordinate) => coordinate.join(',')).join(' ')
}

function getGeometry(node: ElementNode): GeometryElement | undefined {
  const tag = node?.tagName?.toLowerCase()
  if (tag === 'circle') {
    return {
      type: 'circle',
      coordinates: [
        getNodeNumberProperty(node, 'cx'),
        getNodeNumberProperty(node, 'cy')
      ]
    }
  } else if (tag === 'line') {
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
  } else {
    throw new Error(`Unsupported SVG element: ${tag}`)
  }
}

export function* geomEach(svg: string) {
  function* helper(
    node: Node | ElementNode | RootNode
  ): Generator<Node | ElementNode | RootNode, void, undefined> {
    if ('children' in node) {
      for (const childNode of node.children) {
        if (typeof childNode !== 'string') {
          yield* helper(childNode)
        }
      }
    }

    yield node
  }

  const parsedSvg = parse(svg)

  for (const node of helper(parsedSvg)) {
    if ('tagName' in node) {
      if (node.tagName !== 'svg' && node.tagName !== 'g') {
        const geometry = getGeometry(node)
        if (geometry) {
          yield geometry
        }
      }
    }
  }
}

export function createSvgString(elements: GeometryElement[]) {
  return `<svg xmlns="http://www.w3.org/2000/svg">
  ${elements.map(geometryElementToString).join('\n')}
</svg>`
}

function geometryElementToString(element: GeometryElement): string {
  if (element.type === 'circle') {
    return elementToString('circle', {
      ...element.attributes,
      cx: element.coordinates[0],
      cy: element.coordinates[1]
    })
  } else if (element.type === 'line') {
    return elementToString('line', {
      ...element.attributes,
      x1: element.coordinates[0][0],
      y1: element.coordinates[0][1],
      x2: element.coordinates[1][0],
      y2: element.coordinates[1][1]
    })
  } else if (element.type === 'polyline') {
    return elementToString('polyline', {
      ...element.attributes,
      points: coordsToPoints(element.coordinates)
    })
  } else if (element.type === 'polygon') {
    return elementToString('polygon', {
      ...element.attributes,
      points: coordsToPoints(element.coordinates)
    })
  } else if (element.type === 'rect') {
    return elementToString('rect', {
      ...element.attributes,
      x: element.coordinates[0][0],
      y: element.coordinates[0][1],
      width: element.coordinates[1][0] - element.coordinates[0][0],
      height: element.coordinates[2][1] - element.coordinates[0][1]
    })
  } else {
    throw new Error('Unknown SVG element')
  }
}

function elementToString(tag: string, attributes: SVGAttributes): string {
  const attributeStrings = Object.entries(attributes).map(
    ([key, value]) => `${key}="${value}"`
  )
  return `<${tag} ${attributeStrings.join(' ')} />`
}

export function pixelMaskToSvgPolygon(map: Map): Polygon {
  return {
    type: 'polygon',
    attributes: {
      'data-image-uri': encodeURIComponent(map.image.uri)
    },
    coordinates: map.pixelMask
  }
}

export function transformGeoJsonToSvg(
  transformer: Transformer,
  geometry: GeoJSONGeometry,
  options?: OptionalTransformOptions
): GeometryElement {
  if (geometry.type === 'Point') {
    return {
      type: 'circle',
      coordinates: transformer.fromGeoJSONPoint(geometry)
    }
  } else if (geometry.type === 'LineString') {
    return {
      type: 'polyline',
      coordinates: transformer.fromGeoJSONLineString(geometry, options)
    }
  } else if (geometry.type === 'Polygon') {
    return {
      type: 'polygon',
      coordinates: transformer.fromGeoJSONPolygon(geometry, options)
    }
  } else {
    throw new Error(`Unsupported GeoJSON geometry`)
  }
}
