import { defineScreenshot } from '@allmaps/ui/screenshots'

export const editorExportScreenshot = defineScreenshot({
  slug: 'editor-export-version',
  version: 8,
  url: 'https://editor.allmaps.org/results?url=https%3A%2F%2Fark.digitalcommonwealth.org%2Fark%3A%2F50959%2Fdj530101x%2Fmanifest&lang=en',
  viewport: { width: 1067, height: 667, deviceScaleFactor: 1 },
  steps: [
    { action: 'click', selector: 'button[aria-label="Current image"]' },
    { action: 'click', selector: '[role="option"]:has-text("All images")' },
    { action: 'click', selector: '[data-tour="editor-export"]' }
  ],
  targets: { export: '[data-tour="editor-export-popover"]' },
  waitForSelector: '[data-tour="editor-export-popover"]',
  waitForRender: true,
  delay: 1000
})
