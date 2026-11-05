import { readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { publishImages, type ImageInput } from './image-assets.ts'

const root = fileURLToPath(new URL('..', import.meta.url))
const planPath = process.argv[2]
if (!planPath)
  throw new Error(
    'Usage: pnpm images:upload .assets/screenshots.json (or .assets/partners.json)'
  )
const plan: {
  images: ImageInput[]
  partnerPreviews?: string
  replacePrefix?: 'screenshots/' | 'partners/'
  replacePrefixes?: string[]
} = JSON.parse(await readFile(resolve(root, planPath), 'utf8'))
const published = await publishImages(
  plan.images.map((input) => ({
    ...input,
    filename: resolve(root, input.filename)
  }))
)
const manifestPath = resolve(root, 'src/lib/data/image-assets.json')
const previous = JSON.parse(await readFile(manifestPath, 'utf8'))
if (plan.replacePrefix || plan.replacePrefixes) {
  for (const name of Object.keys(previous)) {
    if (
      [
        ...(plan.replacePrefixes ?? []),
        ...(plan.replacePrefix ? [plan.replacePrefix] : [])
      ].some((prefix) => name.startsWith(prefix))
    )
      delete previous[name]
  }
}
const manifest = Object.fromEntries(
  Object.entries({ ...previous, ...published }).sort(([left], [right]) =>
    left.localeCompare(right)
  )
)
const temporaryPath = `${manifestPath}.${randomUUID()}.tmp`
await writeFile(temporaryPath, JSON.stringify(manifest, null, 2) + '\n')
await rename(temporaryPath, manifestPath)
if (plan.partnerPreviews) {
  await writeFile(
    resolve(root, 'src/lib/data/partner-previews.ts'),
    plan.partnerPreviews
  )
}
console.log(`Saved ${plan.images.length} published image references`)
