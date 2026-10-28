import { defineScreenshot } from '@allmaps/ui/screenshots'

export const editorSettingsScreenshot = defineScreenshot({
  slug: 'editor-display-settings',
  version: 3,
  url: 'https://editor.allmaps.org/georeference?url=https%3A%2F%2Fdlc.services%2Fiiif-img%2F7%2F4%2F0b0af56c-d836-4fe4-a9da-7ed66ea7a236%2Finfo.json&map=432c3766cb25d426&bbox=4.15,51.86,4.6,52.13&lang=en',
  viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  steps: [
    // Results becomes available once the saved control points have loaded.
    { action: 'waitFor', selector: '[data-tour="editor-results"][href]' },
    {
      action: 'click',
      selector: 'button[title="Minimize messages"]'
    },
    {
      action: 'click',
      selector: '[data-tour="editor-map-settings"]'
    }
  ],
  targets: {
    settings: '[data-tour="editor-map-settings-popover"]'
  },
  waitForSelector: '[data-tour="editor-map-settings-popover"]',
  // Allow both native map canvases and the saved GCP labels to finish rendering.
  // The warped layer is hidden, so Allmaps render events do not cover this view.
  delay: 25000
})
