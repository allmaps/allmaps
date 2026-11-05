import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

import { screenshotKey } from '@allmaps/ui/screenshots'
import type { ScreenshotDefinition } from '@allmaps/ui/screenshots'
import { contentHash } from './geometry.ts'

/** Resize the same captured frame, retaining the original and its geometry. */
export async function writeScreenshotVariants(
  definition: ScreenshotDefinition,
  options: { directory: string; image?: Buffer; source?: Buffer }
) {
  if (!definition.widths?.length) return []
  const originalFilename = path.join(
    options.directory,
    screenshotKey(definition)
  )
  const image = options.image ?? (await readFile(originalFilename))
  const metadata = await sharp(image).metadata()
  const originalWidth = metadata.width
  if (metadata.format !== 'webp' || !originalWidth) {
    throw new Error(`Screenshot ${definition.slug}: expected a captured WebP`)
  }
  for (const width of definition.widths) {
    if (width > originalWidth) {
      throw new Error(
        `Screenshot ${definition.slug}: variant width ${width} exceeds the captured width ${originalWidth}`
      )
    }
  }
  const sourceSha256 = contentHash(image)
  const filenames: string[] = []
  await mkdir(path.dirname(originalFilename), { recursive: true })
  for (const width of definition.widths) {
    const filename = path.join(
      options.directory,
      screenshotKey(definition, width)
    )
    const metadataFilename = `${filename}.json`
    filenames.push(filename)
    try {
      const cached = JSON.parse(await readFile(metadataFilename, 'utf8'))
      if (
        cached.sourceSha256 === sourceSha256 &&
        cached.width === width &&
        cached.imageSha256 === contentHash(await readFile(filename))
      ) {
        continue
      }
    } catch {
      // Missing, changed, or incomplete variants are regenerated locally.
    }
    const variant =
      width === originalWidth
        ? image
        : await sharp(options.source ?? image)
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 90 })
            .toBuffer()
    const temporaryFilename = `${filename}.${randomUUID()}.tmp`
    await writeFile(temporaryFilename, variant)
    await rename(temporaryFilename, filename)
    await writeFile(
      metadataFilename,
      JSON.stringify({ sourceSha256, width, imageSha256: contentHash(variant) })
    )
  }
  return filenames
}
