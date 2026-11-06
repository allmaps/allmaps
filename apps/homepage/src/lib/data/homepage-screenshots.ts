import { toolIdentities } from './tool-identities.js'
import { PUBLIC_DOCS_BASE_URL } from '$env/static/public'
import type { ScreenshotOptions } from '@allmaps/ui/screenshots'

const docsBaseUrl = PUBLIC_DOCS_BASE_URL.replace(/\/$/, '')

export const homepageScreenshots = {
  editorIiifMap: {
    viewport: { width: 900, height: 600, deviceScaleFactor: 3 },
    url: `${toolIdentities.editor.href}/georeference?url=https%3A%2F%2Fiiif.llyfrgell.cymru%2Fiiif%2F04%2F669%2F04669576.jp2%2Finfo.json&image=https%3A%2F%2Fiiif.llyfrgell.cymru%2Fiiif%2F04%2F669%2F04669576.jp2`,
    slug: 'editor-iiif-map',
    version: 3,
    widths: [480, 900],
    steps: [
      {
        action: 'click',
        selector: 'button[aria-label="Minimize messages"] >> nth=0'
      }
    ],
    delay: 5000
  },
  iiifGeoreferenceExtension: {
    viewport: { width: 900, height: 600, deviceScaleFactor: 3 },
    url: 'https://iiif.io/api/extension/georef/',
    slug: 'iiif-georeference-extension',
    version: 2,
    widths: [480, 885]
  },
  viewerNewYork: {
    viewport: { width: 900, height: 600, deviceScaleFactor: 3 },
    url: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F28ed75ea7a785f32`,
    slug: 'viewer-28ed75ea7a785f32',
    version: 2,
    widths: [480, 900],
    waitForRender: true
  },
  annotoriousBuildingOutlines: {
    viewport: { width: 900, height: 800, deviceScaleFactor: 2 },
    url: `${docsBaseUrl}/guides/annotating-maps-with-annotorious`,
    slug: 'annotorious-building-outlines',
    crop: {
      selector: '[aria-label="Glendale map with Annotorious building polygons"]'
    },
    steps: [
      {
        action: 'click',
        selector:
          '[aria-label="Glendale map with Annotorious building polygons"]'
      }
    ],
    widths: [480],
    delay: 5000
  },
  viewerSourceUrl: {
    viewport: { width: 900, height: 600, deviceScaleFactor: 3 },
    url: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fimages%2F5719a92f4727cdc3`,
    slug: 'viewer-source-url',
    version: 2,
    widths: [480, 900],
    crop: { x: 0, y: 0, width: 900, height: 600 },
    steps: [
      {
        action: 'click',
        selector: 'button[aria-label="Show image view"]'
      },
      {
        action: 'click',
        selector: 'button:has-text("Source information")'
      }
    ],
    waitForSelector: 'input[aria-label^=URL]',
    waitForRender: true,
    delay: 5000
  },
  githubRepository: {
    viewport: { width: 1100, height: 720, deviceScaleFactor: 3 },
    url: 'https://github.com/allmaps/allmaps',
    slug: 'allmaps-github-desktop',
    version: 4,
    widths: [480, 960, 1085]
  },
  viewerDelftAula: {
    viewport: { width: 900, height: 600, deviceScaleFactor: 3 },
    url: `${toolIdentities.viewer.href}/?url=https%3A%2F%2Fannotations.allmaps.org%2Fmaps%2F50942a4e010841aa`,
    slug: 'viewer-delft-aula',
    version: 3,
    widths: [480, 900],
    steps: [
      {
        action: 'click',
        selector: 'button[aria-label="Zoom to extent"]'
      },
      { action: 'click', selector: 'button[aria-label="Zoom in"]' }
    ],
    waitForRender: true
  }
} satisfies Record<string, ScreenshotOptions>
