import type { ScreenshotDefinition } from './screenshots.js'

// The optional screenshots plugin replaces this module during collection/preview.
// The default implementation works in any framework and in the browser.
export function registerScreenshot(definition: ScreenshotDefinition) {
  return definition
}

export function screenshotImageUrl(_key: string, publishedUrl: string) {
  return publishedUrl
}
