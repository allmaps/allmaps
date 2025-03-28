import { layers as basemapLayers } from '@protomaps/basemaps'
import mlcontour from 'maplibre-contour'
import { Map } from 'maplibre-gl'
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec'
import { ALLMAPS_FLAVOR, TERRAIN_COLORS } from './colors.js'

export function basemapStyle(
  lang: string,
  glyphs?: string,
  sprite?: string,
  tileJson?: string
): StyleSpecification {
  const layers = basemapLayers('protomaps', ALLMAPS_FLAVOR, { lang: lang })
  // modify the buildings layer
  layers.forEach((layer) => {
    if (layer.id === 'buildings') {
      if (layer.paint && 'fill-outline-color' in layer.paint) {
        layer.paint['fill-outline-color'] = 'rgba(139, 134, 123, 1)'
      }

      if (layer.paint && 'fill-opacity' in layer.paint) {
        layer.paint['fill-opacity'] = 0.5
      }
    }
  })
  return {
    version: 8,
    glyphs:
      glyphs || 'https://fonts.allmaps.org/maplibre/{fontstack}/{range}.pbf',
    sprite:
      sprite || 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
    sources: {
      protomaps: {
        type: 'vector',
        url:
          tileJson ||
          'https://api.protomaps.com/tiles/v4.json?key=ca7652ec836f269a',
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }
    },
    layers: layers
  }
}

export function addTerrain(map: Map, maplibregl: unknown, tiles?: string) {
  const demSource = new mlcontour.DemSource({
    url:
      tiles ||
      'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    maxzoom: 13
  })

  // @ts-expect-error maplibregl is of unknown type
  demSource.setupMaplibre(maplibregl)
  map.on('load', () => {
    map.addSource('terrain', {
      type: 'raster-dem',
      tiles: [demSource.sharedDemProtocolUrl],
      maxzoom: 13,
      encoding: 'terrarium',
      attribution:
        "<a href='https://github.com/tilezen/joerd/tree/master'>Joerd</a>"
    })

    map.addSource('contour-source', {
      type: 'vector',
      tiles: [
        demSource.contourProtocolUrl({
          thresholds: {
            // zoom: [minor, major]
            11: [50, 200],
            12: [30, 120],
            14: [20, 80],
            15: [10, 40]
          },
          // optional, override vector tile parameters:
          contourLayer: 'contours',
          elevationKey: 'ele',
          levelKey: 'level',
          extent: 4096,
          buffer: 1
        })
      ],
      maxzoom: 15
    })

    map.addLayer(
      {
        id: 'hillshade',
        type: 'hillshade',
        source: 'terrain',
        paint: {
          'hillshade-exaggeration': 0.33,
          'hillshade-shadow-color': TERRAIN_COLORS.hillshade_shadow_color,
          // 'hillshade-highlight-color': TERRAIN_THEME.hillshade_highlight_color,
          'hillshade-accent-color': TERRAIN_COLORS.hillshade_accent_color
        }
      },
      'water'
    )

    map.addLayer(
      {
        id: 'contour-lines',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['>', ['get', 'ele'], 100],
        paint: {
          // level = highest index in thresholds array the elevation is a multiple of
          'line-width': ['match', ['get', 'level'], 1, 1, 0.5],
          'line-color': TERRAIN_COLORS.contour_line_color,
          'line-opacity': 0.1
        }
      },
      'water'
    )
  })
}
