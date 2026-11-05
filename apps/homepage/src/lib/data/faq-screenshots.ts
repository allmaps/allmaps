import { toolIdentities } from './tool-identities.js'
import type { ScreenshotOptions } from '@allmaps/ui/screenshots'

export const faqGeoreferencingScreenshot = {
  url: `${toolIdentities.editor.href}/georeference?url=https%3A%2F%2Fobjects.library.uu.nl%2Ffcgi-bin%2Fiipsrv.fcgi%3FIIIF%3D%2Fmanifestation%2Fviewer%2F19%2F34%2F88%2F19348847988460989169497350348427224179.jp2%2Finfo.json&image=https%3A%2F%2Fobjects.library.uu.nl%2Ffcgi-bin%2Fiipsrv.fcgi%3FIIIF%3D%2Fmanifestation%2Fviewer%2F19%2F34%2F88%2F19348847988460989169497350348427224179.jp2&lang=en`,
  slug: 'faq-editor-utrecht',
  viewport: { width: 900, height: 600, deviceScaleFactor: 2 },
  widths: [480, 900, 1800],
  steps: [
    { action: 'waitFor', selector: 'a[href*="/results?"]' },
    {
      action: 'click',
      selector: 'button[aria-label="Minimize messages"] >> nth=0'
    },
    // Leave a little space around each complete mask.
    {
      action: 'scroll',
      selector: 'canvas.maplibregl-canvas >> nth=0',
      deltaY: 600
    },
    {
      action: 'scroll',
      selector: 'canvas.maplibregl-canvas >> nth=1',
      deltaY: 600
    }
  ],
  waitForRender: true,
  delay: 5000
} satisfies ScreenshotOptions
