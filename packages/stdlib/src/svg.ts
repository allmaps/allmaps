import { parse, Node, ElementNode, RootNode } from 'svg-parser'

import type { Map } from '@allmaps/annotation'

import type {
  Point,
  GeojsonGeometry,
  SvgAttributes,
  SvgPolygon,
  SvgGeometry
} from '@allmaps/types'

// Assert

// TODO!

// Read from string

export function* stringToSvgGeometriesGenerator(svg: string) {
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
        const geometry = getNodeSvgGeometry(node)
        if (geometry) {
          yield geometry
        }
      }
    }
  }
}

function getNodeSvgGeometry(node: ElementNode): SvgGeometry {
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
      coordinates: getNodePoints(node)
    }
  } else if (tag === 'polygon') {
    return {
      type: 'polygon',
      coordinates: getNodePoints(node)
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

function getNodeNumberProperty(node: ElementNode, prop: string): number {
  const value = node?.properties?.[prop]
  return Number(value) || 0
}

function getNodePoints(node: ElementNode): Point[] {
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

function pointsToString(coordinates: Point[]): string {
  return coordinates.map((coordinate) => coordinate.join(',')).join(' ')
}

// Convert to String

export function svgGeometriesToSvgString(geometries: SvgGeometry[]): string {
  return `<svg xmlns="http://www.w3.org/2000/svg">
  ${geometries.map(svgGeometryToString).join('\n')}
</svg>`
}

function svgGeometryToString(geometry: SvgGeometry): string {
  if (geometry.type === 'circle') {
    return elementToString('circle', {
      ...geometry.attributes,
      cx: geometry.coordinates[0],
      cy: geometry.coordinates[1]
    })
  } else if (geometry.type === 'line') {
    return elementToString('line', {
      ...geometry.attributes,
      x1: geometry.coordinates[0][0],
      y1: geometry.coordinates[0][1],
      x2: geometry.coordinates[1][0],
      y2: geometry.coordinates[1][1]
    })
  } else if (geometry.type === 'polyline') {
    return elementToString('polyline', {
      ...geometry.attributes,
      points: pointsToString(geometry.coordinates)
    })
  } else if (geometry.type === 'polygon') {
    return elementToString('polygon', {
      ...geometry.attributes,
      points: pointsToString(geometry.coordinates)
    })
  } else if (geometry.type === 'rect') {
    return elementToString('rect', {
      ...geometry.attributes,
      x: geometry.coordinates[0][0],
      y: geometry.coordinates[0][1],
      width: geometry.coordinates[1][0] - geometry.coordinates[0][0],
      height: geometry.coordinates[2][1] - geometry.coordinates[0][1]
    })
  } else {
    throw new Error('Unknown SVG element')
  }
}

function elementToString(tag: string, attributes: SvgAttributes): string {
  const attributeStrings = Object.entries(attributes).map(
    ([key, value]) => `${key}="${value}"`
  )
  return `<${tag} ${attributeStrings.join(' ')} />`
}

export function mapToResourceMaskSvgPolygon(map: Map): SvgPolygon {
  return {
    type: 'polygon',
    attributes: {
      'data-image-id': encodeURIComponent(map.resource.id)
    },
    coordinates: map.resourceMask
  }
}

// Convert to geojson

export function svgToGeojson(geometry: SvgGeometry): GeojsonGeometry {
  if (geometry.type === 'circle') {
    return {
      type: 'Point',
      coordinates: geometry.coordinates
    }
  } else if (geometry.type === 'line') {
    return {
      type: 'LineString',
      coordinates: geometry.coordinates
    }
  } else if (geometry.type === 'polyline') {
    return {
      type: 'LineString',
      coordinates: geometry.coordinates
    }
  } else if (geometry.type === 'rect') {
    return {
      type: 'Polygon',
      coordinates: [geometry.coordinates]
    }
  } else if (geometry.type === 'polygon') {
    return {
      type: 'Polygon',
      coordinates: [geometry.coordinates]
    }
  } else {
    throw new Error(`Unsupported SVG geometry`)
  }
}
