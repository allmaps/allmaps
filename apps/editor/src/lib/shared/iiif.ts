import type { PartOfItem } from '@allmaps/annotation'
import { parseLanguageString } from '@allmaps/iiif-inspector'
import { getCurrentLocale } from '$lib/i18n/locale.js'
import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage,
  Manifest as IIIFManifest,
  EmbeddedManifest as EmbeddedIIIFManifest,
  Collection as IIIFCollection,
  EmbeddedCollection as EmbeddedIIIFCollection
} from '@allmaps/iiif-parser'

function getImagesInternal(
  images: (IIIFImage | EmbeddedIIIFImage)[],
  parsedIiif:
    | IIIFManifest
    | EmbeddedIIIFManifest
    | IIIFCollection
    | EmbeddedIIIFCollection
) {
  if (parsedIiif.type === 'collection' && 'items' in parsedIiif) {
    parsedIiif.items.map((item) => getImagesInternal(images, item))
    // TODO: don't load all images in collection. Show tree view instead.
  } else if (parsedIiif.type === 'manifest' && 'canvases' in parsedIiif) {
    for (const canvas of parsedIiif.canvases) {
      images.push(canvas.image)
    }
  }
}

export function getImages(
  parsedIiif: IIIFImage | IIIFManifest | IIIFCollection | EmbeddedIIIFCollection
): (IIIFImage | EmbeddedIIIFImage)[] {
  const images: (IIIFImage | EmbeddedIIIFImage)[] = []
  if (parsedIiif.type === 'image') {
    images.push(parsedIiif)
  } else {
    getImagesInternal(images, parsedIiif)
  }

  return images
}

export { parseLanguageString } from '@allmaps/iiif-inspector'

export function parseLocalizedLanguageString(
  value: Parameters<typeof parseLanguageString>[0]
) {
  return parseLanguageString(value, getCurrentLocale())
}

export function labelFromPartOfItem(item: PartOfItem) {
  if (item.label) {
    return parseLocalizedLanguageString(item.label)
  }
}
