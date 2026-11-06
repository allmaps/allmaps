import { execFile } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const executeFile = promisify(execFile)
export const filesBaseUrl = 'https://files.allmaps.org'

export type ImageAsset = {
  url: string
  width: number
  height: number
  sha256: string
}

export type ImageInput = {
  name: string
  filename: string
  key: string
}

export function imageHash(data: Uint8Array) {
  return createHash('sha256').update(data).digest('hex')
}

export function partnerImageKey(filename: string) {
  const match = filename.match(/^([a-z0-9-]+)-(\d+)-([a-f0-9]{12})\.webp$/)
  if (!match) throw new Error(`Invalid partner image filename: ${filename}`)
  return `images/homepage/partners/${match[1]}/${match[2]}w-${match[3]}.webp`
}

/** Upload immutable images through Assets and verify the published bytes. */
export async function publishImages(
  inputs: ImageInput[],
  assetsCli = process.env.ALLMAPS_ASSETS_CLI ??
    fileURLToPath(
      new URL('../../../../static/scripts/assets.ts', import.meta.url)
    )
): Promise<Record<string, ImageAsset>> {
  if (!assetsCli)
    throw new Error(
      'Set ALLMAPS_ASSETS_CLI to the Assets scripts/assets.ts file'
    )
  if (
    new Set(inputs.map((input) => input.name)).size !== inputs.length ||
    new Set(inputs.map((input) => input.key)).size !== inputs.length
  ) {
    throw new Error('Each image must have a unique name and destination key')
  }
  const assets: Record<string, ImageAsset> = {}
  // Small batches keep the Assets API and its publishing worker responsive.
  for (let offset = 0; offset < inputs.length; offset += 3) {
    const results = await Promise.allSettled(
      inputs.slice(offset, offset + 3).map(async (input) => {
        if (
          !/^images\/[a-zA-Z0-9/._-]+$/.test(input.key) ||
          input.key.split('/').includes('..')
        ) {
          throw new Error(`Invalid image key: ${input.key}`)
        }
        const data = await readFile(input.filename)
        const sha256 = imageHash(data)
        const { width, height, format } = await sharp(data).metadata()
        if (!width || !height || !format)
          throw new Error(`Invalid image: ${input.name}`)
        let url = `${filesBaseUrl}/${input.key}`
        const existing = await fetch(`${url}?check=${randomUUID()}`, {
          signal: AbortSignal.timeout(30_000)
        })
        if (existing.ok) {
          if (
            imageHash(new Uint8Array(await existing.arrayBuffer())) !== sha256
          ) {
            throw new Error(
              `Published image differs: ${input.key}. Choose a new version; existing assets are never overwritten.`
            )
          }
        } else {
          if (existing.status !== 404)
            throw new Error(
              `Cannot check ${input.key}: HTTP ${existing.status}`
            )
          let result
          try {
            const { stdout } = await executeFile(
              process.execPath,
              [
                assetsCli,
                'upload',
                'file',
                input.filename,
                '--key',
                input.key,
                '--content-type',
                `image/${format}`
              ],
              { timeout: 300_000, maxBuffer: 1024 * 1024 }
            )
            result = JSON.parse(stdout)
          } catch (error) {
            let message = 'Assets CLI upload failed'
            try {
              message =
                JSON.parse((error as { stdout?: string }).stdout ?? '').error
                  ?.message ?? message
            } catch {
              /* Keep unstructured browser logs out of errors. */
            }
            throw new Error(`${input.key}: ${message}`, { cause: error })
          }
          if (
            !result.ok ||
            result.status !== 'complete' ||
            result.publicUrl !== url
          ) {
            throw new Error(`Assets did not confirm publication at ${url}`)
          }
          url = result.publicUrl
          // Avoid any cached pre-upload 404 while verifying the immutable object.
          const published = await fetch(`${url}?sha256=${sha256}`, {
            signal: AbortSignal.timeout(30_000)
          })
          if (
            !published.ok ||
            imageHash(new Uint8Array(await published.arrayBuffer())) !== sha256
          ) {
            throw new Error(`Published image verification failed: ${input.key}`)
          }
        }
        assets[input.name] = { url, width, height, sha256 }
        console.log(`Published ${input.key}`)
      })
    )
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length)
      throw new AggregateError(
        failures.map((result) => result.reason),
        'Image publication failed; saved manifests were not changed'
      )
  }
  return Object.fromEntries(
    Object.entries(assets).sort(([left], [right]) => left.localeCompare(right))
  )
}
