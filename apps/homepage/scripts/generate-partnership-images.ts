import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { parseAnnotation } from '@allmaps/annotation'
import { partnershipMapSources } from '../src/lib/data/partnership-maps.ts'
import { readImageSizeLimits } from '../src/lib/responsive-image.ts'
import { downloadImageRegion } from './download-image-region.ts'
import type { ImageInput } from './image-assets.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const directory = resolve(root, '.assets/partnership')
await mkdir(directory, { recursive: true })
const images: ImageInput[] = []
const request = async (url: string) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok)
    throw new Error(`Image source HTTP ${response.status}: ${url}`)
  return response
}

for (const source of partnershipMapSources) {
  if (!source.previewImage) continue
  const { slug, version } = source.previewImage
  const maps = parseAnnotation(
    await (await request(source.annotationUrl)).json()
  )
  if (maps.length !== 1) throw new Error(`Expected one map for ${slug}`)
  const serviceUrl = maps[0].resource.id.replace(/\/$/, '')
  const info = await (await request(`${serviceUrl}/info.json`)).json()
  if (!(info.width >= 1920 && info.height > 0))
    throw new Error(`Insufficient native source pixels for ${slug}`)
  const original = await downloadImageRegion(
    serviceUrl,
    { left: 0, top: 0, width: info.width, height: info.height },
    1920,
    readImageSizeLimits(info),
    request
  )
  for (const width of [320, 480, 640, 960, 1280, 1600, 1920]) {
    const filename = `.assets/partnership/${slug}-${width}.webp`
    await sharp(original)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(resolve(root, filename))
    images.push({
      name: `examples/partnership-${slug}-${width}.webp`,
      filename,
      key: `images/homepage/partnership/${slug}/v${version}-${width}w.webp`
    })
  }
  console.log(`Prepared ${slug}: 1920 native pixels wide`)
}

await writeFile(
  resolve(directory, 'upload.json'),
  JSON.stringify({ images }, null, 2) + '\n'
)
console.log('Publish with pnpm images:upload .assets/partnership/upload.json')
