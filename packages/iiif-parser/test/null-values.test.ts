import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

import { IIIF } from '../src/index.js'
import { NavDateSchema } from '../src/schemas/shared.js'

const presentation2Fields = [
  'label',
  'description',
  'metadata',
  'related',
  'attribution',
  'license',
  'rendering',
  'thumbnail',
  'navDate',
  'navPlace'
]

const presentation3Fields = [
  'label',
  'description',
  'metadata',
  'navDate',
  'navPlace',
  'homepage',
  'thumbnail',
  'rendering',
  'seeAlso',
  'summary',
  'rights',
  'provider',
  'requiredStatement',
  'annotations'
]

function readFixture(filename: string) {
  return JSON.parse(readFileSync(`test/input/${filename}.json`, 'utf8'))
}

const presentationCases = [
  {
    version: 2,
    filename: 'manifest.2.stanford-tc010rc2373',
    fields: presentation2Fields
  },
  {
    version: 3,
    filename: 'manifest.3.jd-03909-006-4',
    fields: presentation3Fields
  }
]

for (const { version, filename, fields } of presentationCases) {
  describe(`Null values in Presentation ${version}`, () => {
    test.each(fields)(
      'treats %s as absent on manifests and canvases',
      (field) => {
        const absent = readFixture(filename)
        const source = readFixture(filename)
        const absentCanvases =
          version === 2 ? absent.sequences[0].canvases : absent.items
        const sourceCanvases =
          version === 2 ? source.sequences[0].canvases : source.items

        delete absent[field]
        source[field] = null
        for (const canvas of absentCanvases) {
          delete canvas[field]
        }
        for (const canvas of sourceCanvases) {
          canvas[field] = null
        }

        expect(IIIF.parse(source)).toEqual(IIIF.parse(absent))
        expect(source[field]).toBeNull()
      }
    )

    test('preserves source null values with keepSource', () => {
      const source = readFixture(filename)
      source.description = null

      const parsed = IIIF.parse(source, { keepSource: true })

      expect(parsed.source).toBe(source)
      expect(source.description).toBeNull()
    })

    test('allows null optional properties within thumbnails and links', () => {
      const source = readFixture(filename)
      const identifier = version === 2 ? '@id' : 'id'
      const thumbnail = {
        [identifier]: 'https://example.org/thumbnail.jpg',
        [version === 2 ? '@type' : 'type']: null,
        format: null,
        width: null,
        height: null
      }
      source.thumbnail = version === 2 ? thumbnail : [thumbnail]
      const link = {
        [identifier]: 'https://example.org/catalogue',
        label: version === 2 ? 'Catalogue' : { en: ['Catalogue'] },
        format: null,
        language: null
      }
      source[version === 2 ? 'related' : 'homepage'] = [link]

      const parsed = IIIF.parse(source)
      if (parsed.type !== 'manifest') {
        throw new Error('Expected a manifest')
      }

      expect(parsed.thumbnail?.[0].id).toBe('https://example.org/thumbnail.jpg')
      expect(parsed.thumbnail?.[0].width).toBeUndefined()
      expect(parsed.thumbnail?.[0].height).toBeUndefined()
      expect(parsed.homepage?.[0].id).toBe('https://example.org/catalogue')
      expect(parsed.homepage?.[0].format).toBeUndefined()
      expect(parsed.homepage?.[0].language).toBeUndefined()
    })

    test('uses canvas dimensions when embedded image dimensions are null', () => {
      const source = readFixture(filename)
      const canvas =
        version === 2 ? source.sequences[0].canvases[0] : source.items[0]
      const image =
        version === 2
          ? canvas.images[0].resource
          : canvas.items[0].items[0].body
      const service = version === 2 ? image.service : image.service[0]
      image.width = null
      image.height = null
      service.width = null
      service.height = null

      const parsed = IIIF.parse(source)
      if (parsed.type !== 'manifest') {
        throw new Error('Expected a manifest')
      }

      expect(parsed.canvases[0].image.width).toBe(canvas.width)
      expect(parsed.canvases[0].image.height).toBe(canvas.height)
    })

    test.each(['id', 'width', 'height', 'service'])(
      'still rejects null required %s',
      (field) => {
        const source = readFixture(filename)
        const canvas =
          version === 2 ? source.sequences[0].canvases[0] : source.items[0]

        if (field === 'id') {
          source[version === 2 ? '@id' : 'id'] = null
        } else if (field === 'service') {
          const image =
            version === 2
              ? canvas.images[0].resource
              : canvas.items[0].items[0].body
          image.service = null
        } else {
          canvas[field] = null
        }

        expect(() => IIIF.parse(source)).toThrow()
      }
    )

    test('still rejects malformed non-null descriptions', () => {
      const source = readFixture(filename)
      source.description = { unexpected: 'value' }

      expect(() => IIIF.parse(source)).toThrow()
    })

    test('skips incomplete metadata entries and preserves valid neighbors', () => {
      const source = readFixture(filename)
      const label = version === 2 ? 'Creator' : { en: ['Creator'] }
      const value = version === 2 ? 'Cartographer' : { en: ['Cartographer'] }
      source.metadata = [
        { label, value: null },
        { label, value },
        null,
        { label: null, value }
      ]

      const parsed = IIIF.parse(source)
      if (parsed.type !== 'manifest') {
        throw new Error('Expected a manifest')
      }

      expect(parsed.metadata).toEqual([
        {
          label: { [version === 2 ? 'none' : 'en']: ['Creator'] },
          value: { [version === 2 ? 'none' : 'en']: ['Cartographer'] }
        }
      ])
    })

    test('allows null fields on collections and embedded references', () => {
      const nullFields = Object.fromEntries(
        fields.map((field) => [field, null])
      )
      const embeddedNullFields = Object.fromEntries(
        [
          'label',
          'description',
          'metadata',
          'thumbnail',
          'navDate',
          'navPlace'
        ].map((field) => [field, null])
      )
      const identifier = version === 2 ? '@id' : 'id'
      const type = version === 2 ? '@type' : 'type'
      const manifestType = version === 2 ? 'sc:Manifest' : 'Manifest'
      const collectionType = version === 2 ? 'sc:Collection' : 'Collection'
      const memberField = version === 2 ? 'members' : 'items'
      const source = {
        [identifier]: 'https://example.org/collection',
        [type]: collectionType,
        ...nullFields,
        [memberField]: [
          {
            [identifier]: 'https://example.org/manifest',
            [type]: manifestType,
            ...embeddedNullFields
          },
          {
            [identifier]: 'https://example.org/subcollection',
            [type]: collectionType,
            ...embeddedNullFields
          }
        ],
        ...(version === 2 ? { manifests: null, collections: null } : {})
      }

      const parsed = IIIF.parse(source)
      if (parsed.type !== 'collection') {
        throw new Error('Expected a collection')
      }

      expect(parsed.items).toHaveLength(2)
      expect(parsed.items.map((item) => item.uri)).toEqual([
        'https://example.org/manifest',
        'https://example.org/subcollection'
      ])
      expect(parsed.navDate).toBeUndefined()
      expect(parsed.items[0].navDate).toBeUndefined()
    })
  })
}

describe('Null values in Image information', () => {
  test.each([
    {
      filename: 'image.1.gallica.bnf.12148.btv1b53243704g.f1',
      fields: ['scale_factors', 'tile_width', 'tile_height']
    },
    {
      filename: 'image.2.stanford-tc010rc2373-PaloAlto3',
      fields: ['@type', 'sizes', 'tiles']
    },
    {
      filename: 'image.3.918ecd18c2592080851777620de9bcb5-gottingen',
      fields: [
        'maxWidth',
        'maxHeight',
        'maxArea',
        'sizes',
        'tiles',
        'extraFeatures',
        'extraFormats',
        'preferredFormats'
      ]
    }
  ])(
    'treats optional fields as absent in $filename',
    ({ filename, fields }) => {
      const absent = readFixture(filename)
      const source = readFixture(filename)
      for (const field of fields) {
        delete absent[field]
        source[field] = null
      }

      expect(IIIF.parse(source)).toEqual(IIIF.parse(absent))
    }
  )
})

describe('Navigation dates', () => {
  test.each([null, undefined, 'not-a-date'])('treats %s as absent', (value) => {
    expect(NavDateSchema.parse(value)).toBeUndefined()
  })

  test.each(['2026-10-19T00:00:00Z', '1970-01-01T00:00:00Z', 0])(
    'preserves valid date %s',
    (value) => {
      expect(NavDateSchema.parse(value)).toEqual(new Date(value))
    }
  )
})
