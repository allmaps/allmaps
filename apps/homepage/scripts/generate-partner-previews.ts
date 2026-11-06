import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseAnnotation } from '@allmaps/annotation'
import { format, resolveConfig } from 'prettier'
import sharp from 'sharp'

import {
  highlightedPartnerMaps,
  type HighlightedPartnerMap
} from '../src/lib/data/partners.ts'
import { downloadImageRegion } from './download-image-region.ts'
import { partnerImageKey, filesBaseUrl } from './image-assets.ts'
import { getPartnerCrop } from '../src/lib/partner-preview.ts'
import {
  getPreviewWidths,
  readImageSizeLimits
} from '../src/lib/responsive-image.ts'

async function preparePreview(
  slug: string,
  selection: HighlightedPartnerMap,
  fetch: typeof globalThis.fetch
) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid partner slug: ${slug}`)
  }

  async function request(url: string) {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(30_000)
    }).catch((cause) => {
      throw new Error(`${slug}: could not fetch ${url}`, { cause })
    })
    if (!response.ok) throw new Error(`${slug}: HTTP ${response.status} ${url}`)
    return response
  }

  const annotationUrl =
    selection.annotationUrl ??
    `https://annotations.allmaps.org/maps/${selection.mapId}`
  const serviceUrl = selection.imageServiceUrl.replace(/\/$/, '')
  const [annotation, info] = await Promise.all([
    request(annotationUrl).then((response) => response.json()),
    selection.previewImageUrl
      ? Promise.resolve({})
      : request(`${serviceUrl}/info.json`).then((response) => response.json())
  ])
  const maps = parseAnnotation(annotation)
  if (maps.length !== 1) {
    throw new Error(`${slug}: expected one map, received ${maps.length}`)
  }
  const map = maps[0]
  map.resource.width ??= info.width
  map.resource.height ??= info.height
  const { width, height } = map.resource
  if (
    !width ||
    !height ||
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1
  ) {
    throw new Error(`${slug}: invalid image dimensions`)
  }

  const limits = readImageSizeLimits(info)
  limits.maxWidth = Math.min(
    limits.maxWidth ?? Infinity,
    selection.previewWidth ?? Infinity
  )
  // Services can replace their master image after an annotation was made.
  // Keep the annotation's mask coordinates, but size downloads using the
  // current service dimensions and encode using the actual returned pixels.
  const validServiceDimensions =
    Number.isSafeInteger(info.width) &&
    info.width > 0 &&
    Number.isSafeInteger(info.height) &&
    info.height > 0
  const sourceWidth = validServiceDimensions ? info.width : width
  const sourceHeight = validServiceDimensions ? info.height : height
  const region =
    selection.previewRegion && !selection.previewImageUrl
      ? getPartnerCrop(
          map,
          sourceWidth,
          sourceHeight,
          selection.location,
          selection.previewBounds
        )
      : undefined
  // Cropping before downloading keeps the IIIF pixel budget focused on the
  // institution's neighborhood rather than the entire sheet.
  const downloadWidth = getPreviewWidths(
    region?.width ?? sourceWidth,
    region?.height ?? sourceHeight,
    limits
  ).at(-1)!
  const original = region
    ? await downloadImageRegion(
        serviceUrl,
        region,
        selection.previewWidth ?? 1280,
        limits,
        request
      )
    : Buffer.from(
        await (
          await request(
            selection.previewImageUrl ??
              `${serviceUrl}/full/${downloadWidth},/0/default.jpg`
          )
        ).arrayBuffer()
      )
  const image = sharp(original, { limitInputPixels: 20_000_000 })
  const metadata = await image.metadata()
  const crop = region
    ? { left: 0, top: 0, width: metadata.width, height: metadata.height }
    : getPartnerCrop(
        map,
        metadata.width,
        metadata.height,
        selection.location,
        selection.previewBounds
      )

  const images = []
  for (const width of getPreviewWidths(
    crop.width,
    crop.height,
    region || selection.previewImageUrl
      ? { maxWidth: selection.previewWidth }
      : limits
  )) {
    const { data, info } = await image
      .clone()
      .extract(crop)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true })
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12)
    images.push({
      filename: `${slug}-${info.width}-${hash}.webp`,
      width: info.width,
      height: info.height,
      data
    })
  }
  const largest = images.at(-1)!
  return {
    slug,
    geometry: {
      annotationUrl,
      intrinsicWidth: largest.width,
      intrinsicHeight: largest.height
    },
    images
  }
}

// Fetch and encode the entire set before changing any saved previews.
export async function generatePartnerPreviews(
  partners: Partial<Record<string, HighlightedPartnerMap>>,
  appDirectory: string,
  fetch: typeof globalThis.fetch = globalThis.fetch
) {
  const selections = Object.entries(partners)
    .filter((entry): entry is [string, HighlightedPartnerMap] => !!entry[1])
    .sort(([left], [right]) => left.localeCompare(right))
  const previews: Awaited<ReturnType<typeof preparePreview>>[] = []
  for (let offset = 0; offset < selections.length; offset += 3) {
    const results = await Promise.allSettled(
      selections
        .slice(offset, offset + 3)
        .map(([slug, selection]) => preparePreview(slug, selection, fetch))
    )
    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length) {
      throw new AggregateError(
        failures.map((failure) => failure.reason),
        'Could not refresh partner previews; existing previews were preserved'
      )
    }
    for (const result of results) {
      if (result.status === 'fulfilled') previews.push(result.value)
    }
  }

  const imageDirectory = join(appDirectory, '.assets/partners')
  const dataDirectory = join(appDirectory, '.assets')
  const manifestPath = join(dataDirectory, 'partner-previews.ts')

  const entries = previews.map(({ slug, geometry, images }) => {
    const sources = images.map((image) => ({
      ...image,
      url: `${filesBaseUrl}/${partnerImageKey(image.filename)}`
    }))
    const fallback =
      sources.find((source) => source.width >= 640) ?? sources.at(-1)!
    const properties = Object.entries(geometry)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    return `${JSON.stringify(slug)}: {
      ${properties.join(',\n')},
      imageUrl: ${JSON.stringify(fallback.url)},
      imageSrcset: [${sources.map(({ url, width }) => JSON.stringify(`${url} ${width}w`)).join(',')}].join(', ')
    }`
  })
  const manifest = await format(
    `
    // Generated by partners:previews and published with images:upload. Do not edit.
    import type { PartnerPreviewData } from '../partner-preview.js'
    export const partnerPreviews = {
      ${entries.join(',\n')}
    } satisfies Record<string, PartnerPreviewData>
  `,
    { ...(await resolveConfig(manifestPath)), parser: 'typescript' }
  )

  await mkdir(imageDirectory, { recursive: true })
  await mkdir(dataDirectory, { recursive: true })
  const images = previews.flatMap((preview) => preview.images)
  // Content-based filenames leave the previous manifest usable until replacement.
  for (const image of images) {
    await writeFile(join(imageDirectory, image.filename), image.data)
  }
  const temporaryManifest = `${manifestPath}.${randomUUID()}.tmp`
  try {
    await writeFile(temporaryManifest, manifest)
    await rename(temporaryManifest, manifestPath)
  } finally {
    await rm(temporaryManifest, { force: true })
  }
  await writeFile(
    join(dataDirectory, 'partners.json'),
    JSON.stringify(
      {
        replacePrefix: 'partners/',
        images: images.map((image) => ({
          name: `partners/${image.filename}`,
          filename: `.assets/partners/${image.filename}`,
          key: partnerImageKey(image.filename)
        })),
        partnerPreviews: manifest
      },
      null,
      2
    ) + '\n'
  )
  const filenames = new Set(images.map((image) => image.filename))
  for (const filename of await readdir(imageDirectory)) {
    if (
      /^[a-z0-9-]+-\d+-[a-f0-9]{12}\.webp$/.test(filename) &&
      !filenames.has(filename)
    ) {
      await rm(join(imageDirectory, filename))
    }
  }
  return {
    partners: previews.length,
    images: images.length,
    bytes: images.reduce((sum, image) => sum + image.data.length, 0)
  }
}

if (import.meta.main) {
  const result = await generatePartnerPreviews(
    highlightedPartnerMaps,
    fileURLToPath(new URL('../', import.meta.url))
  )
  console.log(
    `Prepared ${result.images} WebPs for ${result.partners} partners (${Math.round(result.bytes / 1024)} KiB). Publish with pnpm images:upload .assets/partners.json`
  )
}
