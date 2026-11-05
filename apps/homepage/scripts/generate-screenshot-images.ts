import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { imageHash, type ImageAsset, type ImageInput } from './image-assets.ts'
import {
  showcaseProjects,
  getShowcaseScreenshot
} from '../src/lib/data/showcase.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = resolve(root, '.assets/screenshots')
const manifest = JSON.parse(
  await readFile(resolve(root, 'scripts/screenshot-captures.json'), 'utf8')
)
const sources: {
  slug: string
  version: number
  filename?: string
  asset?: string
  maximum: number
}[] = [
  ...manifest.screenshots.map(
    ({ slug, version = 1 }: { slug: string; version?: number }) => ({
      slug,
      version,
      filename: `.screenshots/responsive-captures/screenshots/${slug}/v${version}.webp`,
      maximum: 1920
    })
  ),
  {
    slug: 'tools-cli-terminal',
    version: 1,
    filename: 'src/lib/images/cli-terminal.svg',
    maximum: 2016
  },
  {
    slug: 'allmaps-here-data',
    version: 1,
    asset: 'data/here-1920.webp',
    maximum: 1920
  },
  ...showcaseProjects.map((project) => {
    const { slug, version } = getShowcaseScreenshot(project)
    return {
      slug,
      version,
      filename: `.screenshots/captures/screenshots/${slug}/v${version}.webp`,
      maximum: 1400
    }
  })
]

const assets: Record<string, ImageAsset> = JSON.parse(
  await readFile(resolve(root, 'src/lib/data/image-assets.json'), 'utf8')
)
const images: ImageInput[] = []
await mkdir(output, { recursive: true })
for (const { slug, version, filename, asset, maximum } of sources) {
  let source: string | Buffer
  if (asset) {
    const original = assets[asset]
    const response = await fetch(original.url, {
      signal: AbortSignal.timeout(30_000)
    })
    if (!response.ok)
      throw new Error(`Cannot fetch preserved original: ${original.url}`)
    source = Buffer.from(await response.arrayBuffer())
    if (imageHash(source) !== original.sha256)
      throw new Error(`Preserved original changed: ${asset}`)
  } else {
    source = resolve(root, filename!)
  }
  const { width: sourceWidth } = await sharp(source).metadata()
  if (!sourceWidth) throw new Error(`Missing image width: ${filename}`)
  const maximumWidth = Math.min(sourceWidth, maximum)
  const widths = [...new Set([320, 480, 640, 960, 1280, maximumWidth])]
    .filter((width) => width <= maximumWidth)
    .sort((a, b) => a - b)
  for (const width of widths) {
    const name = `screenshots/${slug}-${width}.webp`
    images.push({
      name,
      filename: `.assets/${name}`,
      key: `images/screenshots/${slug}/v${version}-${width}w.webp`
    })
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(resolve(output, `${slug}-${width}.webp`))
  }
  console.log(`${slug}: ${widths.join(', ')}px`)
}

await writeFile(
  resolve(root, '.assets/screenshots.json'),
  JSON.stringify({ replacePrefix: 'screenshots/', images }, null, 2) + '\n'
)
console.log('Publish with pnpm images:upload .assets/screenshots.json')
