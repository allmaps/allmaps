import type { PartOfItem } from '@allmaps/annotation'
import type {
  LanguageString,
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

export function parseLanguageString(
  languageString?: LanguageString,
  preferredLanguage?: string
) {
  if (!languageString) {
    return ''
  }

  let strings: (string | number | boolean)[] = []

  if (preferredLanguage && languageString[preferredLanguage]) {
    strings = languageString[preferredLanguage]
  } else if (languageString['none']) {
    strings = languageString['none']
  } else if (typeof languageString === 'object' && languageString !== null) {
    if (Object.values(languageString)[0]) {
      strings = Object.values(languageString)[0]
    }
  }

  return strings.map((string) => String(string)).join(' ')
}

export function labelFromPartOfItem(item: PartOfItem) {
  if (item.label) {
    return parseLanguageString(item.label)
  }
}
