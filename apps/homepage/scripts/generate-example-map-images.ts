import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// This explicit authoring command uses the monorepo's built rendering packages.
import { Viewport } from '../../../packages/render/dist/index.js'
import { WasmRenderer } from '../../../packages/render/dist/wasm.js'
import * as wasm from '../../../packages/render-wasm/pkg/allmaps_render_wasm.js'
import type { ImageInput } from './image-assets.ts'

type MapImageRecipe = {
  slug: string
  version: number
  annotationUrl: string
  bounds: [number, number, number, number]
  rotation?: number
  size: [number, number]
  widths: number[]
  phoneCrop?: {
    region: [number, number, number, number]
    widths: number[]
  }
}

const root = fileURLToPath(new URL('..', import.meta.url))
const { maps }: { maps: MapImageRecipe[] } = JSON.parse(
  await readFile(resolve(root, 'scripts/example-map-images.json'), 'utf8')
)
const requestedSlug = process.argv[2]
const selectedMaps = requestedSlug
  ? maps.filter(({ slug }) => slug === requestedSlug)
  : maps
if (!selectedMaps.length)
  throw new Error(`Unknown example map: ${requestedSlug}`)
wasm.initSync({
  module: await readFile(
    fileURLToPath(
      new URL(
        '../../../packages/render-wasm/pkg/allmaps_render_wasm_bg.wasm',
        import.meta.url
      )
    )
  )
})
const directory = resolve(root, '.assets/example-map-images')
await mkdir(directory, { recursive: true })
const images: ImageInput[] = []
for (const recipe of selectedMaps) {
  let activeRequests = 0
  const waitingRequests: (() => void)[] = []
  const failedRequests = new Set<string>()
  const fetchMapResource: typeof fetch = async (url, options) => {
    if (activeRequests >= 6)
      await new Promise<void>((resolve) => waitingRequests.push(resolve))
    else activeRequests++
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30_000)
          })
          if (response.ok) return response
          throw new Error(`Image source HTTP ${response.status}: ${url}`)
        } catch (error) {
          if (attempt === 2) {
            failedRequests.add(String(url))
            throw error
          }
        }
      }
    } finally {
      const nextRequest = waitingRequests.shift()
      if (nextRequest) nextRequest()
      else activeRequests--
    }
  }
  const renderer = new WasmRenderer(wasm, {
    fetchFn: fetchMapResource,
    createRTree: false,
    outputFormat: 'png',
    backgroundColor: [255, 255, 255],
    interpolation: 'cubic'
  })
  const response = await fetch(recipe.annotationUrl, {
    signal: AbortSignal.timeout(30_000)
  })
  if (!response.ok)
    throw new Error(
      `Annotation HTTP ${response.status}: ${recipe.annotationUrl}`
    )
  renderer.addGeoreferenceAnnotation(await response.json())
  const [left, bottom, right, top] = recipe.bounds
  const viewport = Viewport.fromSizeAndGeoPolygon(
    recipe.size,
    [
      [
        [left, bottom],
        [right, bottom],
        [right, top],
        [left, top]
      ]
    ],
    { fit: 'cover', rotation: ((recipe.rotation ?? 0) * Math.PI) / 180 }
  )
  const original = await renderer.render(viewport)
  if (failedRequests.size)
    throw new Error(
      `Incomplete render for ${recipe.slug}: ${failedRequests.size} source requests failed`
    )
  await writeFile(
    resolve(directory, `${recipe.slug}-v${recipe.version}.png`),
    original
  )
  const crops = [{ suffix: '', source: original, widths: recipe.widths }]
  if (recipe.phoneCrop) {
    const [left, top, width, height] = recipe.phoneCrop.region
    crops.push({
      suffix: '-phone',
      source: await sharp(original)
        .extract({ left, top, width, height })
        .toBuffer(),
      widths: recipe.phoneCrop.widths
    })
  }
  for (const crop of crops) {
    const metadata = await sharp(crop.source).metadata()
    for (const width of crop.widths) {
      if (!metadata.width || width > metadata.width)
        throw new Error(`Variant would upscale ${recipe.slug}${crop.suffix}`)
      const name = `examples/${recipe.slug}${crop.suffix}-${width}.webp`
      const filename = `.assets/example-map-images/${recipe.slug}${crop.suffix}-${width}.webp`
      await sharp(crop.source)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 90 })
        .toFile(resolve(root, filename))
      images.push({
        name,
        filename,
        key: `images/homepage/examples/${recipe.slug}/v${recipe.version}${crop.suffix}-${width}w.webp`
      })
    }
  }
  console.log(
    `Rendered ${recipe.slug}: ${recipe.size.join(' × ')} native pixels`
  )
}
await writeFile(
  resolve(directory, 'upload.json'),
  JSON.stringify({ images }, null, 2) + '\n'
)
console.log(
  'Publish with pnpm images:upload .assets/example-map-images/upload.json'
)
