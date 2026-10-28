import { defineScreenshot } from '@allmaps/ui/screenshots'

export const editorExportScreenshot = defineScreenshot({
  slug: 'editor-export-version',
  version: 5,
  url: 'https://editor.allmaps.org/results?url=https%3A%2F%2Fgallica.bnf.fr%2Fiiif%2Fark%3A%2F12148%2Fbtv1b530297676%2Ff1%2Finfo.json&lang=en',
  viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  steps: [
    { action: 'click', selector: 'button[title="Minimize messages"]' },
    { action: 'click', selector: '[data-tour="editor-export"]' },
    { action: 'click', selector: 'label:has(input[value="current"])' }
  ],
  targets: { export: '[data-tour="editor-export-popover"]' },
  waitForSelector: '[data-tour="editor-export-popover"]',
  waitForRender: true,
  delay: 1000
})
