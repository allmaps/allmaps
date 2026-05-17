import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'
import { fetchAnnotationsFromApi } from '@allmaps/stdlib'
import { generateChecksum } from '@allmaps/id/sync'

import { getAllmapsIdFromUrl } from '$lib/shared/api.js'

import type {
  ParsedSource,
  UrlSource,
  StringSource
} from '$lib/types/shared.js'

async function parseSource(
  json: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fetch?: typeof globalThis.fetch
): Promise<ParsedSource> {
  if (
    json &&
    typeof json === 'object' &&
    'type' in json &&
    (json.type === 'Annotation' || json.type === 'AnnotationPage')
  ) {
    // json is probably a Georeference Annotation
    const maps = parseAnnotation(json)
    return {
      type: 'annotation',
      maps
    }
  } else {
    // json is not a valid Georeference Annotation
    // Try iiif-parser instead
    const parsedIiif = IIIF.parse(json)

    // let embeddedMaps: GeoreferencedMap[] | undefined

    // TODO: handle embedded annotations inside manifests
    // if (parsedIiif.type==='manifest' ) {
    //   parsedIiif.annotations
    // }

    const apiAnnotations = await fetchAnnotationsFromApi(parsedIiif)
    const apiMaps = parseAnnotation(apiAnnotations)

    return {
      type: 'iiif',
      iiif: parsedIiif,
      apiMaps
    }
  }
}

export async function sourceFromUrl(
  url: string,
  fetch = globalThis.fetch
): Promise<UrlSource> {
  const data = await fetch(url).then((response) => response.json())

  const allmapsId = getAllmapsIdFromUrl(url)

  return {
    sourceType: 'url',
    allmapsId,
    hash: generateChecksum(url),
    url,
    data,
    parsed: await parseSource(data, fetch)
  }
}

export async function sourceFromData(
  data: unknown,
  fetch?: typeof globalThis.fetch
): Promise<StringSource> {
  return {
    sourceType: 'string',
    hash: generateChecksum(data),
    data,
    parsed: await parseSource(data, fetch)
  }
}
