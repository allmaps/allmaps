import type { StyleSpecification } from 'maplibre-gl'

export function makeStyleTransparent(style: StyleSpecification) {
  const transparentStyle = structuredClone(style)

  transparentStyle.layers.map((layer) => {
    if (layer.type === 'fill') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['fill-opacity'] = 0
    } else if (layer.type === 'line') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['line-opacity'] = 0
    } else if (layer.type === 'symbol') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['icon-opacity'] = 0
      layer.paint['text-opacity'] = 0
    } else if (layer.type === 'circle') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['circle-opacity'] = 0
      layer.paint['circle-stroke-opacity'] = 0
    } else if (layer.type === 'heatmap') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['heatmap-opacity'] = 0
    } else if (layer.type === 'fill-extrusion') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['fill-extrusion-opacity'] = 0
    } else if (layer.type === 'raster') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['raster-opacity'] = 0
    } else if (layer.type === 'background') {
      if (!layer.paint) {
        layer.paint = {}
      }

      layer.paint['background-opacity'] = 0
    }
  })

  return transparentStyle
}
