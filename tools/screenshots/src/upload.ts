import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { contentHash, loadScreenshotGeometry } from './geometry.ts'
import { writeScreenshotVariants } from './variants.ts'

import { screenshotKey, screenshotGeometryKey } from '@allmaps/ui/screenshots'
import type { ScreenshotDefinition } from '@allmaps/ui/screenshots'

const executeFile = promisify(execFile)

type ScreenshotAsset = 'image' | 'geometry' | { width: number }

function assetKey(definition: ScreenshotDefinition, asset: ScreenshotAsset) {
  return asset === 'geometry'
    ? screenshotGeometryKey(definition)
    : screenshotKey(
        definition,
        typeof asset === 'object' ? asset.width : undefined
      )
}

export function uploadArguments(
  cli: string,
  filename: string,
  definition: ScreenshotDefinition,
  overwrite = false,
  asset: ScreenshotAsset = 'image'
) {
  return [
    cli,
    'upload',
    'file',
    filename,
    '--key',
    assetKey(definition, asset),
    '--content-type',
    asset === 'geometry' ? 'application/json' : 'image/webp',
    ...(overwrite ? ['--overwrite'] : [])
  ]
}

export async function uploadScreenshot(
  cli: string,
  filename: string,
  definition: ScreenshotDefinition,
  overwrite = false,
  asset: ScreenshotAsset = 'image'
): Promise<{ publicUrl: string }> {
  let stdout: string
  try {
    const result = await executeFile(
      process.execPath,
      uploadArguments(cli, filename, definition, overwrite, asset),
      {
        maxBuffer: 1024 * 1024,
        timeout: 300_000
      }
    )
    stdout = result.stdout
  } catch (error) {
    const output = (error as { stdout?: string }).stdout
    let message = 'Assets upload failed. Check your CLI login and destination.'
    try {
      const result = JSON.parse(output ?? '')
      if (typeof result.error?.message === 'string')
        message = result.error.message
    } catch {
      // Avoid echoing process arguments or unstructured browser logs.
    }
    throw new Error(message)
  }
  const result = JSON.parse(stdout)
  if (
    !result.ok ||
    result.status !== 'complete' ||
    typeof result.publicUrl !== 'string'
  ) {
    throw new Error('Assets CLI did not confirm a completed upload')
  }
  return { publicUrl: result.publicUrl }
}

/** Publish validated images and geometry, retaining receipts for safe retries. */
export async function publishScreenshot(
  definition: ScreenshotDefinition,
  options: { directory: string; assetsCli: string; overwrite?: boolean }
): Promise<{
  publicUrl: string
  geometryPublicUrl?: string
  variantPublicUrls?: Record<number, string>
}> {
  if (definition.targets || definition.crop) {
    await loadScreenshotGeometry(definition, options)
  }
  await writeScreenshotVariants(definition, options)
  const assets: ScreenshotAsset[] = [
    'image',
    ...(definition.targets || definition.crop ? ['geometry' as const] : []),
    ...(definition.widths ?? []).map((width) => ({ width }))
  ]
  const urls = new Map<ScreenshotAsset, string>()
  const origin =
    process.env.ALLMAPS_ASSETS_BASE_URL ?? 'https://assets.allmaps.org'
  for (const asset of assets) {
    const key = assetKey(definition, asset)
    const filename = path.join(options.directory, key)
    const receiptFilename = `${filename}.upload.json`
    const hash = contentHash(await readFile(filename))
    let receipt: { hash: string; origin: string; publicUrl: string } | undefined
    try {
      receipt = JSON.parse(await readFile(receiptFilename, 'utf8'))
    } catch {
      // A missing or unreadable receipt requires an upload.
    }
    let publicUrl: string
    if (
      receipt?.hash === hash &&
      receipt.origin === origin &&
      typeof receipt.publicUrl === 'string' &&
      !options.overwrite
    ) {
      publicUrl = receipt.publicUrl
    } else {
      const uploaded = await uploadScreenshot(
        path.resolve(options.assetsCli),
        filename,
        definition,
        options.overwrite,
        asset
      )
      publicUrl = uploaded.publicUrl
      await writeFile(
        receiptFilename,
        JSON.stringify({ hash, origin, publicUrl })
      )
    }
    urls.set(asset, publicUrl)
  }
  return {
    publicUrl: urls.get('image')!,
    ...(urls.has('geometry')
      ? { geometryPublicUrl: urls.get('geometry')! }
      : {}),
    ...(definition.widths?.length
      ? {
          variantPublicUrls: Object.fromEntries(
            [...urls].flatMap(([asset, url]) =>
              typeof asset === 'object' ? [[asset.width, url]] : []
            )
          )
        }
      : {})
  }
}
