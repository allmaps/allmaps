import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  screenshotGeometryKey,
  screenshotKey,
  validateScreenshotGeometry
} from '@allmaps/ui/screenshots'
import type { ScreenshotDefinition } from '@allmaps/ui/screenshots'

export function contentHash(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex')
}

/** Load at build time and pass the result as Screenshot's geometry prop. */
export async function loadScreenshotGeometry(
  definition: Pick<ScreenshotDefinition, 'slug' | 'version'>,
  options: { directory: string }
) {
  const [content, image] = await Promise.all([
    readFile(
      path.join(options.directory, screenshotGeometryKey(definition)),
      'utf8'
    ),
    readFile(path.join(options.directory, screenshotKey(definition)))
  ])
  const geometry = validateScreenshotGeometry(JSON.parse(content))
  if (
    geometry.slug !== definition.slug ||
    geometry.version !== definition.version ||
    geometry.imageSha256 !== contentHash(image)
  ) {
    throw new Error('Screenshot geometry does not match the captured image')
  }
  return geometry
}
