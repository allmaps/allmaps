import { layersWithCustomTheme } from 'protomaps-themes-base'
import mlcontour from 'maplibre-contour'
import { Map } from 'maplibre-gl'
import { StyleSpecification } from '@maplibre/maplibre-gl-style-spec'
import { ALLMAPS_THEME_5, TERRAIN_THEME } from './colors'

export function basemapStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs:
      'https://bdon.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: 'https://protomaps.github.io/basemaps-assets/sprites/v4/light',
    sources: {
      protomaps: {
        type: 'vector',
        tiles: [
          'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=ca7652ec836f269a'
        ],
        maxzoom: 14,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'
      }
    },
    layers: layersWithCustomTheme('protomaps', ALLMAPS_THEME_5, "en")
  }
}

export function addTerrain(map: Map, maplibregl: any) {
  const demSource = new mlcontour.DemSource({
    url: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
    maxzoom: 13
  })
  demSource.setupMaplibre(maplibregl);
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
            11: [200, 1000],
            12: [100, 500],
            14: [50, 200],
            15: [20, 100]
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
          'hillshade-shadow-color': TERRAIN_THEME.hillshade_shadow_color,
          // 'hillshade-highlight-color': TERRAIN_THEME.hillshade_highlight_color,
          'hillshade-accent-color': TERRAIN_THEME.hillshade_accent_color
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
        paint: {
          // level = highest index in thresholds array the elevation is a multiple of
          'line-width': ['match', ['get', 'level'], 1, 1, 0.5],
          'line-color': TERRAIN_THEME.contour_line_color
        }
      },
      'water'
    )
  })
}
