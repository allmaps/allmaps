import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import { defineScreenshot, screenshotKey } from '@allmaps/ui/screenshots'
import type {
  ScreenshotDefinition,
  ScreenshotManifest,
  ScreenshotOptions
} from '@allmaps/ui/screenshots'

export function createManifest(
  definitions: ScreenshotOptions[]
): ScreenshotManifest {
  const screenshots = new Map<string, ScreenshotDefinition>()
  for (const options of definitions) {
    const definition = defineScreenshot(options)
    const key = screenshotKey(definition)
    const previous = screenshots.get(key)
    if (previous && JSON.stringify(previous) !== JSON.stringify(definition)) {
      throw new Error(`Conflicting screenshot definitions for ${key}`)
    }
    screenshots.set(key, definition)
  }
  return {
    version: 1,
    screenshots: [...screenshots.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, definition]) => definition)
  }
}

export async function readManifest(filename: string) {
  let content: string
  try {
    content = await readFile(filename, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(
        `Screenshot manifest not found: ${filename}. Build the app first.`
      )
    }
    throw error
  }
  const manifest = JSON.parse(content)
  if (manifest?.version !== 1 || !Array.isArray(manifest.screenshots)) {
    throw new Error(`Invalid screenshot manifest: ${filename}`)
  }
  return createManifest(manifest.screenshots)
}

export async function writeManifest(directory: string, filename: string) {
  const definitions = await Promise.all(
    (await readdir(directory))
      .filter((file) => file.endsWith('.json'))
      .map(async (file) =>
        JSON.parse(await readFile(path.join(directory, file), 'utf8'))
      )
  )
  const manifest = createManifest(definitions)
  await mkdir(path.dirname(filename), { recursive: true })
  const temporary = `${filename}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`)
  await rename(temporary, filename)
  return manifest
}
