import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import type { ImageInput } from './image-assets.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const recipes: {
  version: number
  screenshots: { slug: string; version: number }[]
} = JSON.parse(
  await readFile(resolve(root, 'scripts/retina-captures.json'), 'utf8')
)
const images: ImageInput[] = []
const replacePrefixes: string[] = []
for (const { slug, version } of recipes.screenshots) {
  const filename = resolve(
    root,
    `.assets/retina-captures/screenshots/${slug}/v${version}.webp`
  )
  const metadata = await sharp(filename).metadata()
  const maximum = Math.min(metadata.width!, 2560)
  for (const width of [...new Set([320, 480, 640, 960, 1280, 1600, maximum])]
    .filter((width) => width <= maximum)
    .sort((a, b) => a - b)) {
    const name = `screenshots/${slug}-${width}.webp`
    await mkdir(resolve(root, '.assets/retina-images'), { recursive: true })
    const output = `.assets/retina-images/${slug}-${width}.webp`
    await sharp(filename)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 90 })
      .toFile(resolve(root, output))
    images.push({
      name,
      filename: output,
      key: `images/screenshots/${slug}/v${version}-${width}w.webp`
    })
  }
  replacePrefixes.push(`screenshots/${slug}-`)
}
await writeFile(
  resolve(root, '.assets/retina-images.json'),
  JSON.stringify({ images, replacePrefixes }, null, 2) + '\n'
)
console.log(
  `Prepared ${images.length} variants. Publish with pnpm images:upload .assets/retina-images.json`
)
