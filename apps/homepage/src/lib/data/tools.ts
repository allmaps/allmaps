import { orange, blue, pink, green, purple } from '@allmaps/tailwind'
import { toolIdentities } from './tool-identities.js'
import { getScreenshotImage } from './screenshot-images.js'
import type { ScreenshotOptions } from '@allmaps/ui/screenshots'

const tileServerImage =
  'https://files.allmaps.org/images/screenshots/qgis-desktop/v1-1308w.webp'
const tileServerImage480 =
  'https://files.allmaps.org/images/screenshots/qgis-desktop/v1-480w.webp'

export type Tool = {
  label: string
  href: string
  description: string
  color: string
  badge?: string
  image: {
    src: string
    srcset: string
    alt: string
  }
  screenshot?: ScreenshotOptions
}

export const tools: Tool[] = [
  {
    label: toolIdentities.editor.name,
    href: toolIdentities.editor.href,
    description:
      'Georeference IIIF maps by entering the URL of a manifest or image.',
    color: orange,
    image: {
      ...getScreenshotImage('tools-editor-rotterdam'),
      alt: 'Allmaps Editor showing control points on a historical map of Rotterdam and a modern map'
    },
    screenshot: {
      url: `${toolIdentities.editor.href}/georeference?url=https%3A%2F%2Fdlc.services%2Fiiif-img%2F7%2F4%2F0b0af56c-d836-4fe4-a9da-7ed66ea7a236%2Finfo.json&map=432c3766cb25d426&bbox=4.15%2C51.86%2C4.6%2C52.13&lang=en`,
      slug: 'tools-editor-rotterdam',
      viewport: { width: 1200, height: 750, deviceScaleFactor: 2 },
      widths: [480, 900],
      steps: [
        {
          action: 'click',
          selector: 'button[aria-label="Minimize messages"] >> nth=0'
        }
      ],
      delay: 5000
    }
  },
  {
    label: toolIdentities.viewer.name,
    href: toolIdentities.viewer.href,
    description: 'View georeferenced maps from a Georeference Annotation URL.',
    color: blue,
    image: {
      ...getScreenshotImage('tools-viewer-liber-floridus'),
      alt: 'A map of Europe from Liber Floridus warped over a modern map in Allmaps Viewer'
    },
    screenshot: {
      url: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fimages%2F9d77cf5c62742b6a`,
      slug: 'tools-viewer-liber-floridus',
      version: 2,
      viewport: { width: 1200, height: 750, deviceScaleFactor: 3 },
      widths: [320, 480, 640, 960, 1280, 1600, 2400],
      waitForRender: true
    }
  },
  {
    label: toolIdentities.latest.name,
    href: toolIdentities.latest.href,
    description: 'Browse the latest maps georeferenced with Allmaps Editor.',
    color: pink,
    image: {
      ...getScreenshotImage('tools-latest'),
      alt: 'Colorful map masks and collection links in Allmaps Latest'
    },
    screenshot: {
      url: `${toolIdentities.latest.href}/`,
      slug: 'tools-latest',
      viewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
      widths: [480, 900],
      delay: 10000
    }
  },
  {
    label: toolIdentities.here.name,
    href: toolIdentities.here.href,
    description: 'Find georeferenced maps near your current location.',
    color: green,
    image: {
      ...getScreenshotImage('allmaps-here-data'),
      alt: 'Allmaps Here marking the same location on three historical maps of Delft'
    },
    screenshot: {
      url: `${toolIdentities.here.href}/?position=52.01,4.36`,
      slug: 'tools-here',
      viewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
      widths: [480, 900],
      delay: 10000
    }
  },
  {
    label: toolIdentities.cli.name,
    href: toolIdentities.cli.href,
    description: 'Work with Allmaps from the command line.',
    color: purple,
    image: {
      ...getScreenshotImage('tools-cli-terminal'),
      alt: 'Allmaps CLI help output in a black terminal window, showing its annotation, IIIF, transformation and scripting commands'
    }
  },
  {
    label: toolIdentities.tileServer.name,
    href: toolIdentities.tileServer.href,
    description:
      'Use Georeference Annotations as XYZ tile layers in other tools.',
    color: orange,
    image: {
      src: tileServerImage,
      srcset: `${tileServerImage480} 480w, ${tileServerImage} 1308w`,
      alt: 'A historical map displayed over OpenStreetMap in QGIS using Allmaps map tiles'
    }
  },
  {
    label: toolIdentities.arcade.name,
    href: toolIdentities.arcade.href,
    description:
      'Put historical maps back where they belong in a map-placement game.',
    color: blue,
    image: {
      ...getScreenshotImage('tools-arcade'),
      alt: 'Allmaps Arcade’s colorful introduction to its historical map-placement game'
    },
    screenshot: {
      url: `${toolIdentities.arcade.href}/`,
      slug: 'tools-arcade',
      viewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
      widths: [480, 900],
      delay: 5000
    }
  },
  {
    label: toolIdentities.explore.name,
    href: toolIdentities.explore.href,
    description:
      'Explore georeferenced maps by place, with map footprints and image previews.',
    badge: 'Prototype',
    color: pink,
    image: {
      ...getScreenshotImage('tools-explore-prototype'),
      alt: 'The Allmaps Explore prototype showing map footprints around Delft and historical map previews'
    },
    screenshot: {
      url: `${toolIdentities.explore.href}/#11.82/51.99947/4.36406`,
      slug: 'tools-explore-prototype',
      viewport: { width: 1200, height: 800, deviceScaleFactor: 2 },
      widths: [480, 900],
      delay: 10000
    }
  }
]
