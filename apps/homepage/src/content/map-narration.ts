import type { NarrationConfig, NarrationSlide } from '../shared/map-narration'

export const narrationConfig: NarrationConfig = {
  basemapStyleUrl:
    'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  backgroundColor: 'blue-100',
  interactive: true
}

// Map sequence adapted from Allmaps Slides template.
// https://github.com/allmaps/slides-template
const url =
  'https://annotations.allmaps.org/maps/e9aa6ec10276bf65@c8c1e1934bc93e0f'

export const narrationSlides: NarrationSlide[] = [
  {
    title: 'Georeferencing with Allmaps',
    description:
      'Allmaps helps you turn digitized maps into maps you can explore, compare and share. See how it works with this historical map of Amsterdam.',
    hideBasemap: true,
    useBearing: true,
    zoomOffset: 3,
    warpedMaps: [
      { url, options: { applyMask: false, transformationType: 'helmert' } }
    ]
  },
  {
    title: 'Draw a mask',
    description:
      'Open a digitized map in Allmaps Editor with a IIIF link from its library or archive. Outline the part of the image you want to use. This is called the <b>mask</b>.',
    hideBasemap: true,
    useBearing: true,
    warpedMaps: [
      {
        url,
        options: {
          applyMask: false,
          renderMask: true,
          transformationType: 'helmert'
        }
      }
    ]
  },
  {
    title: 'Add locations',
    description:
      'Match recognizable places on the image with their respective locations on a modern map. These <b>control points</b> tell Allmaps where the old map belongs.',
    hideBasemap: true,
    useBearing: true,
    warpedMaps: [
      {
        url,
        options: {
          applyMask: false,
          renderMask: true,
          renderTransformedGcps: true,
          transformationType: 'helmert'
        }
      }
    ]
  },
  {
    title: 'See it on the map',
    description:
      'Allmaps moves, scales, rotates and skews the original image in order to fit it on top of a modern map, right in your browser. Now you can see Amsterdam’s old streets and canals alongside the city today.',
    warpedMaps: [
      {
        url,
        options: {
          applyMask: true,
          renderTransformedGcps: true,
          transformationType: 'polynomial'
        }
      }
    ]
  },
  {
    title: 'Compare past and present',
    showOpacitySlider: true,
    description:
      'Look closely to see where the maps agree or differ. The white lines show the distance between the geospatial locations and the corresponding places on the historical map.',
    location: { center: [4.897004, 52.3691733], zoom: 15 },
    warpedMaps: [
      {
        url,
        options: {
          renderGcps: true,
          renderTransformedGcps: true,
          renderVectors: true,
          renderVectorsColor: '#ffffff',
          transformationType: 'polynomial',
          opacity: 0.8
        }
      }
    ]
  },
  {
    title: 'Find the right fit',
    description:
      'Allmaps can also distort the image to perfectly line up the places you matched. But watch out: a close fit at these points does not make every detail accurate!',
    location: { center: [4.897004, 52.3691733], zoom: 15 },
    warpedMaps: [
      {
        url,
        options: {
          renderGcps: true,
          renderTransformedGcps: true,
          renderVectors: true,
          transformationType: 'thinPlateSpline',
          opacity: 0.8
        }
      }
    ]
  },
  {
    title: 'Share what you discover',
    description:
      'Share a link to Allmaps Viewer or add the map to your own website with Allmaps’ open source tools. Follow the steps below to try it with a map from your favorite collection.',
    warpedMaps: [
      { url, options: { transformationType: 'thinPlateSpline', opacity: 1 } }
    ],
    links: [
      {
        label: 'View in Allmaps Viewer',
        href: `https://viewer.allmaps.org/?url=${encodeURIComponent(url)}`
      }
    ]
  },
  {
    title: 'Credits',
    description:
      '<i>This story uses the Van Berckenrode map of Amsterdam (1625) from Allard Pierson (University of Amsterdam). For creating narrative maps yourself, please check out the Allmaps Slides template</i>',
    links: [
      {
        label: 'View at Allard Pierson',
        href: 'https://hdl.handle.net/11245/3.39844'
      },
      {
        label: 'Allmaps Slides template',
        href: 'https://github.com/allmaps/slides-template'
      }
    ],
    attributions: [
      {
        label: '© OpenStreetMap contributors',
        href: 'https://www.openstreetmap.org/copyright'
      },
      {
        label: '© CARTO',
        href: 'https://carto.com/attributions'
      }
    ],
    hideBasemap: true,
    useBearing: true,
    warpedMaps: [
      { url, options: { applyMask: false, transformationType: 'helmert' } }
    ]
  }
]
