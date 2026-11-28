import assert from 'node:assert/strict'
import { glob, readFile } from 'node:fs/promises'
import test from 'node:test'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import jsonld from 'jsonld'
import type { ContextDefinition, NodeObject, Options } from 'jsonld'
import type { SchemaObject } from 'ajv'

import map1 from '../../annotation/test/input/map.nagwjzJ6qURmPEHV-with-id.json' with { type: 'json' }
import map2 from '../../annotation/test/input/map.projection.json' with { type: 'json' }

import { z } from 'zod'
import {
  SerializedGeoreferencedMap1Schema,
  SerializedGeoreferencedMap2Schema
} from '@allmaps/annotation/serialized'

const origin = 'https://schemas.allmaps.org'
const mapTerms = origin + '/map/'
const listTerms = origin + '/lists/'
const georef = 'http://iiif.io/api/extension/georef/vocab/georef-terms/#'
const mapContext = mapTerms + '2/context.json'
const listContext = listTerms + '1/context.json'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'))
}

const annotationContext = await readJson<NodeObject>('./fixtures/anno.jsonld')
const contexts = new Map([
  [mapContext, await readJson<NodeObject>('../dist/site/map/2/context.json')],
  [
    listContext,
    await readJson<NodeObject>('../dist/site/lists/1/context.json')
  ],
  ['http://www.w3.org/ns/anno.jsonld', annotationContext],
  ['https://www.w3.org/ns/anno.jsonld', annotationContext]
])
const options: Options.Expand = {
  base: 'https://annotations.allmaps.org/',
  async documentLoader(url) {
    const document = contexts.get(url)
    assert.ok(document, 'Unexpected remote document: ' + url)
    return { documentUrl: url, document }
  }
}

test('the root JSON index links to every published document', async () => {
  const site = new URL('../dist/site/', import.meta.url)
  const rewrite = await readFile(new URL('_redirects', site), 'utf8')
  assert.match(rewrite, /^\/\s+\/index\.json\s+200$/m)
  const index = await readJson<{
    maps: Record<string, Record<string, string>>
    lists: Record<string, Record<string, string>>
  }>('../dist/site/index.json')
  assert.deepEqual(index.maps, {
    '1': { schema: '/map/1/schema.json' },
    '2': { schema: '/map/2/schema.json', context: '/map/2/context.json' }
  })
  assert.deepEqual(index.lists, { '1': { context: '/lists/1/context.json' } })
  const indexedPaths = []
  for (const version of [
    ...Object.values(index.maps),
    ...Object.values(index.lists)
  ]) {
    for (const path of Object.values(version)) {
      indexedPaths.push(path.slice(1))
      const document = await readJson<NodeObject>(`../dist/site${path}`)
      assert.ok(document.$schema || document['@context'])
    }
  }
  const publishedPaths = []
  for await (const path of glob('*/*/*.json', { cwd: site })) {
    publishedPaths.push(path)
  }
  assert.deepEqual(indexedPaths.sort(), publishedPaths.sort())
})

for (const [version, schema] of [
  [1, SerializedGeoreferencedMap1Schema],
  [2, SerializedGeoreferencedMap2Schema]
] as const) {
  test(`map v${version} JSON Schema matches its Zod definition`, async () => {
    const published = await readJson(`../dist/site/map/${version}/schema.json`)
    assert.deepEqual(published, {
      $id: `${mapTerms}${version}/schema.json`,
      title: `Allmaps Georeferenced Map v${version}`,
      ...z.toJSONSchema(schema, { target: 'draft-2020-12', io: 'input' })
    })
  })
}

test('the versioned schemas validate their own map format', async () => {
  const ajv = new Ajv2020({ allowUnionTypes: true })
  addFormats(ajv)
  for (const [version, map, other, dimension, mask] of [
    [1, map1, map2, 'image', 'pixelMask'],
    [2, map2, map1, 'resource', 'resourceMask']
  ] as const) {
    const schema = await readJson<SchemaObject>(
      `../dist/site/map/${version}/schema.json`
    )
    assert.equal(schema.$id, `${mapTerms}${version}/schema.json`)
    const valid = ajv.compile(schema)
    assert.ok(valid(map), JSON.stringify(valid.errors))
    assert.equal(valid(other), false)
    assert.equal(valid({ ...map, [dimension]: undefined }), false)
    assert.equal(
      valid({
        ...map,
        [mask]: [
          [0, 0],
          [1, 1]
        ]
      }),
      false
    )
    for (const point of [[1], [1, 2, 3], ['1', 2]]) {
      assert.equal(
        valid({ ...map, gcps: [{ ...map.gcps[0], [dimension]: point }] }),
        false
      )
    }
  }
})

test('map expansion preserves IIIF identities, ordered coordinates and CRS', async () => {
  const [expanded] = await jsonld.expand(map2, options)
  assert.equal(expanded['@id'], map2.id)
  assert.deepEqual(expanded['@type'], [mapTerms + 'GeoreferencedMap'])
  const values = (point: number[]) =>
    point.map((coordinate) => ({ '@value': coordinate }))
  assert.partialDeepStrictEqual(expanded, {
    [mapTerms + 'resource']: [
      {
        '@id': map2.resource.id,
        '@type': ['http://iiif.io/api/image/2#ImageService']
      }
    ],
    [mapTerms + 'gcps']: [
      {
        '@list': map2.gcps.map((gcp) => ({
          [georef + 'resourceCoords']: [{ '@list': values(gcp.resource) }],
          [mapTerms + 'geo']: [{ '@list': values(gcp.geo) }]
        }))
      }
    ],
    [georef + 'transformation']: [
      {
        '@type': [georef + 'polynomial'],
        [georef + 'options']: [{ [georef + 'order']: [{ '@value': 1 }] }]
      }
    ],
    [mapTerms + 'resourceCrs']: [
      { [mapTerms + 'definition']: [{ '@value': map2.resourceCrs.definition }] }
    ]
  })
  assert.deepEqual(expanded[mapTerms + 'resourceMask'], [
    {
      '@list': map2.resourceMask.map((point) => ({ '@list': values(point) }))
    }
  ])
})

test('map v2 expands timestamps and keeps extension metadata as JSON', async () => {
  const metadata = { resource: 'local value', coordinates: [2, 1] }
  const [expanded] = await jsonld.expand(
    { ...map2, _allmaps: metadata },
    options
  )
  assert.deepEqual(expanded[mapTerms + '_allmaps'], [
    { '@type': '@json', '@value': metadata }
  ])
  for (const field of ['created', 'modified'] as const) {
    assert.deepEqual(expanded['http://purl.org/dc/terms/' + field], [
      {
        '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
        '@value': map2[field]
      }
    ])
  }
})

test('a list expands exactly as it did with the API’s inline context', async () => {
  const legacy: (string | ContextDefinition)[] = [
    'http://www.w3.org/ns/anno.jsonld',
    {
      georeferenceAnnotations: {
        '@id': listTerms + 'georeferenceAnnotations',
        '@type': '@id'
      },
      georeferencedMapCount: listTerms + 'georeferencedMapCount',
      allmapsUrl: { '@id': listTerms + 'allmapsUrl', '@type': '@id' },
      fallbackImageService: {
        '@id': listTerms + 'fallbackImageService',
        '@type': '@id'
      },
      imageService: { '@id': listTerms + 'imageService', '@type': '@id' }
    }
  ]
  const collection = {
    id: 'https://annotations.allmaps.org/@alice/lists/maps',
    type: 'AnnotationCollection',
    georeferenceAnnotations: '/annotations',
    first: {
      type: 'AnnotationPage',
      items: [
        {
          type: 'Annotation',
          motivation: 'bookmarking',
          georeferencedMapCount: 2,
          allmapsUrl: '/maps/a',
          target: {
            id: '/canvases/a',
            imageService: '/images/a',
            fallbackImageService: '/images/b'
          }
        }
      ]
    }
  }
  const expand = (context: string | typeof legacy) =>
    jsonld.expand({ '@context': context, ...collection }, options)
  assert.deepEqual(await expand(listContext), await expand(legacy))
})

test('nested IIIF resources and provider metadata retain their identities', async () => {
  const resource = {
    ...map2.resource,
    type: 'Canvas',
    partOf: [{ id: 'https://example.org/manifest', type: 'Manifest' }],
    provider: [
      {
        label: { en: ['Library'] },
        homepage: [{ id: 'https://example.org/library', type: 'Text' }]
      }
    ]
  }
  const document = { ...map2, resource }
  const ajv = new Ajv2020({ allowUnionTypes: true })
  addFormats(ajv)
  assert.ok(
    ajv.validate(
      await readJson<SchemaObject>('../dist/site/map/2/schema.json'),
      document
    )
  )
  const [expanded] = await jsonld.expand(document, options)
  assert.partialDeepStrictEqual(expanded, {
    [mapTerms + 'resource']: [
      {
        '@type': ['http://iiif.io/api/presentation/3#Canvas'],
        'http://purl.org/dc/terms/isPartOf': [{ '@id': resource.partOf[0].id }],
        'https://schema.org/provider': [
          {
            'http://www.w3.org/2000/01/rdf-schema#label': [
              { '@value': 'Library', '@language': 'en' }
            ],
            'http://xmlns.com/foaf/0.1/homepage': [
              { '@id': resource.provider[0].homepage[0].id }
            ]
          }
        ]
      }
    ]
  })
})
