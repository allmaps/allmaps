import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export type ImageFixtureMetadata = {
  id?: string
  label: string
  imageLabel?: string
  manifestLabel?: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  originalAnnotationUrl?: string
  originalManifestUrl?: string
  originalImageService?: string
  originalImageRequest?: string
  institution?: string
  institutionHomepage?: string
}

export type ImageFixtureDefinition = {
  id: string
  label: string
  imageLabel?: string
  manifestLabel?: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  hasManifest: boolean
  imagePath: string
  annotationPath: string
  originalManifestPath?: string
}

const sourceFixturesDirectory = join(process.cwd(), 'static', 'iiif', 'images')
const builtFixturesDirectory = join(
  process.cwd(),
  'build',
  'client',
  'iiif',
  'images'
)

export const fixturesDirectory = existsSync(sourceFixturesDirectory)
  ? sourceFixturesDirectory
  : builtFixturesDirectory

export function getFixtureDirectory(imageId: string) {
  return join(fixturesDirectory, imageId)
}

export function getFixtureMetadataPath(imageId: string) {
  return join(getFixtureDirectory(imageId), 'fixture.json')
}

export function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T
}

export function loadImageDefinitions(): ImageFixtureDefinition[] {
  return readdirSync(fixturesDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const imageId = entry.name
      const fixtureDirectory = getFixtureDirectory(imageId)
      const metadataPath = join(fixtureDirectory, 'fixture.json')

      if (!existsSync(metadataPath)) {
        return []
      }

      const metadata = readJsonFile<ImageFixtureMetadata>(metadataPath)
      const originalManifestPath = join(
        fixtureDirectory,
        'original-manifest.json'
      )

      return [
        {
          id: metadata.id ?? imageId,
          label: metadata.label,
          imageLabel: metadata.imageLabel,
          manifestLabel: metadata.manifestLabel,
          width: metadata.width,
          height: metadata.height,
          originalWidth: metadata.originalWidth,
          originalHeight: metadata.originalHeight,
          hasManifest: existsSync(originalManifestPath),
          imagePath: join(fixtureDirectory, 'default.webp'),
          annotationPath: join(fixtureDirectory, 'annotation.json'),
          originalManifestPath: existsSync(originalManifestPath)
            ? originalManifestPath
            : undefined
        }
      ]
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}
