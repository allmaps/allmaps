import { z } from 'zod'
import { SerializedGeoreferencedMap2Schema } from '@allmaps/annotation/serialized'

type Term =
  | string
  | {
      '@id': string
      '@type'?: string
      '@container'?: '@list' | '@language'
      '@context'?: Context
    }
type Context = { '@version'?: 1.1 } & Record<string, Term | 1.1>
type Annotations = { fields: Record<string, Term>; vocabulary: Context }

const annotations = z.registry<Annotations>()

function annotate<T extends z.ZodObject, K extends keyof T['shape'] & string>(
  schema: T,
  fields: Record<K, Term>,
  vocabulary: Context = {}
) {
  annotations.add(schema, { fields, vocabulary })
}

const map = SerializedGeoreferencedMap2Schema
const mapTerms = 'https://schemas.allmaps.org/map/'
const iiifPresentation = 'http://iiif.io/api/presentation/3#'
const exif = 'http://www.w3.org/2003/12/exif/ns#'

annotate(map.shape.gcps.element, {
  resource: { '@id': 'georef:resourceCoords', '@container': '@list' },
  geo: { '@id': mapTerms + 'geo', '@container': '@list' }
})

annotate(
  map.shape.resource,
  {
    width: { '@id': exif + 'width', '@type': 'xsd:integer' },
    height: { '@id': exif + 'height', '@type': 'xsd:integer' },
    partOf: 'dcterms:isPartOf',
    provider: 'https://schema.org/provider'
  },
  {
    Canvas: iiifPresentation + 'Canvas',
    Manifest: iiifPresentation + 'Manifest',
    Collection: iiifPresentation + 'Collection',
    ImageService1: 'http://iiif.io/api/image/1#ImageService',
    ImageService2: 'http://iiif.io/api/image/2#ImageService',
    ImageService3: 'http://iiif.io/api/image/3#ImageService',
    Agent: 'dcterms:Agent',
    Text: 'http://purl.org/dc/dcmitype/Text',
    homepage: 'http://xmlns.com/foaf/0.1/homepage',
    label: {
      '@id': 'http://www.w3.org/2000/01/rdf-schema#label',
      '@container': '@language',
      '@context': { none: '@none' }
    },
    format: 'http://purl.org/dc/elements/1.1/format',
    language: 'http://purl.org/dc/elements/1.1/language'
  }
)

annotate(
  map.shape.transformation.unwrap(),
  { options: 'georef:options' },
  {
    polynomial: 'georef:polynomial',
    thinPlateSpline: 'georef:thinPlateSpline',
    order: 'georef:order'
  }
)

annotate(
  map,
  {
    id: '@id',
    type: '@type',
    created: { '@id': 'dcterms:created', '@type': 'xsd:dateTime' },
    modified: { '@id': 'dcterms:modified', '@type': 'xsd:dateTime' },
    resource: mapTerms + 'resource',
    gcps: { '@id': mapTerms + 'gcps', '@container': '@list' },
    resourceMask: { '@id': mapTerms + 'resourceMask', '@container': '@list' },
    transformation: 'georef:transformation',
    _allmaps: { '@id': mapTerms + '_allmaps', '@type': '@json' }
  },
  {
    '@version': 1.1,
    '@vocab': mapTerms,
    georef: 'http://iiif.io/api/extension/georef/vocab/georef-terms/#',
    dcterms: 'http://purl.org/dc/terms/',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    definition: { '@id': mapTerms + 'definition', '@type': '@json' },
    geoMask: { '@id': mapTerms + 'geoMask', '@type': '@json' }
  }
)

function contextFor(schema: z.ZodObject): Context {
  const metadata = annotations.get(schema)
  if (!metadata) throw new Error('Missing JSON-LD annotations')
  const context = { ...metadata.vocabulary }
  for (const [name, term] of Object.entries(metadata.fields)) {
    let child = schema.shape[name]
    while (child instanceof z.ZodOptional || child instanceof z.ZodArray) {
      child = child.unwrap()
    }
    if (child instanceof z.ZodObject && annotations.has(child)) {
      context[name] = {
        ...(typeof term === 'string' ? { '@id': term } : term),
        '@context': contextFor(child)
      }
    } else {
      context[name] = term
    }
  }
  return context
}

export const map2Context = { '@context': contextFor(map) }
