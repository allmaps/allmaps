import { describe, expect, test } from 'vitest'

import {
  findBestYearInIIIFResource,
  findYearCandidatesInIIIFResource,
  findYearInCanvas,
  findYearInIIIFResource,
  findYearInManifest,
  findYearsInLanguageString,
  findYearsInMetadata,
  findYearsInValue,
  parseLanguageString
} from '../src/index.js'

import type { LanguageString, Metadata } from '@allmaps/iiif-parser'

describe('parseLanguageString', () => {
  test('uses the preferred language when available', () => {
    expect(
      parseLanguageString(
        {
          none: ['Kaart van Amsterdam'],
          en: ['Map of Amsterdam']
        },
        'en'
      )
    ).to.equal('Map of Amsterdam')
  })

  test('falls back to none and then the first language', () => {
    expect(parseLanguageString({ none: ['Amsterdam'] }, 'en')).to.equal(
      'Amsterdam'
    )
    expect(parseLanguageString({ nl: ['Amsterdam'] }, 'en')).to.equal(
      'Amsterdam'
    )
  })

  test('stringifies number and boolean values', () => {
    expect(parseLanguageString({ none: [1888, true] })).to.equal('1888 true')
  })
})

describe('find years from values', () => {
  test('finds valid four-digit years', () => {
    expect(findYearsInValue('Surveyed 1865, revised 1898')).to.deep.equal([
      { value: 'Surveyed 1865, revised 1898', year: 1865 },
      { value: 'Surveyed 1865, revised 1898', year: 1898 }
    ])
  })

  test('ignores years outside the configured range', () => {
    expect(findYearsInValue('1492 1500 1501 2199 2200 2201')).to.deep.equal([
      { value: '1492 1500 1501 2199 2200 2201', year: 1501 },
      { value: '1492 1500 1501 2199 2200 2201', year: 2199 }
    ])
  })

  test('ignores years in URLs', () => {
    expect(
      findYearsInValue('Published 1850 https://example.org/iiif/1999/info')
    ).to.deep.equal([
      {
        value: 'Published 1850 https://example.org/iiif/1999/info',
        year: 1850
      }
    ])
  })
})

describe('find years from IIIF fields', () => {
  test('finds years from language strings', () => {
    const languageString: LanguageString = {
      none: ['Published 1901'],
      nl: ['Herzien in 1912']
    }

    expect(findYearsInLanguageString(languageString)).to.deep.equal([
      { value: 'Published 1901', year: 1901, language: 'none' },
      { value: 'Herzien in 1912', year: 1912, language: 'nl' }
    ])
  })

  test('finds years from metadata values', () => {
    const metadata: Metadata = [
      {
        label: { none: ['Date'] },
        value: { none: ['1857'] }
      },
      {
        label: { none: ['Publisher'] },
        value: { none: ['Published around 1880'] }
      }
    ]

    expect(findYearsInMetadata(metadata)).to.deep.equal([
      {
        value: '1857',
        year: 1857,
        source: 'metadata',
        metadataLabel: 'Date'
      },
      {
        value: 'Published around 1880',
        year: 1880,
        approximate: true,
        source: 'metadata',
        metadataLabel: 'Publisher'
      }
    ])
  })
})

describe('find year from IIIF resources', () => {
  test('uses navDate for manifests and canvases', () => {
    const manifest = {
      navDate: new Date('1870-05-01')
    } as Parameters<typeof findYearInManifest>[0]

    const canvas = {
      navDate: new Date('1880-05-01')
    } as Parameters<typeof findYearInCanvas>[0]

    expect(findYearInManifest(manifest)).to.equal(1870)
    expect(findYearInCanvas(canvas)).to.equal(1880)
  })

  test('keeps navDate as the highest-confidence candidate', () => {
    expect(
      findBestYearInIIIFResource({
        navDate: new Date('1870-05-01'),
        metadata: [
          {
            label: { none: ['Date'] },
            value: { none: ['1857'] }
          }
        ]
      })
    ).toMatchObject({
      year: 1870,
      source: 'navDate'
    })
  })

  test('prefers date metadata over identifiers and text fields', () => {
    expect(
      findYearInIIIFResource({
        metadata: [
          {
            label: { none: ['Identifier'] },
            value: { none: ['Object 1600'] }
          },
          {
            label: { none: ['Digitized'] },
            value: { none: ['2020'] }
          },
          {
            label: { none: ['Date'] },
            value: { none: ['1898'] }
          }
        ],
        label: { none: ['Map 1850'] },
        description: {
          none: [
            'This description mentions many events including 1550 and 1560'
          ]
        },
        summary: { none: ['Summary 1901'] }
      })
    ).to.equal(1898)
  })

  test('prefers label years over incidental description years', () => {
    expect(
      findYearInIIIFResource({
        label: { none: ['Map 1898'] },
        description: {
          none: [
            'This description mentions related historical events in 1550 and 1560'
          ]
        }
      })
    ).to.equal(1898)
  })

  test('returns scored candidates for debugging', () => {
    const candidates = findYearCandidatesInIIIFResource({
      metadata: [
        {
          label: { none: ['Date'] },
          value: { none: ['1898'] }
        }
      ],
      label: { none: ['Map 1850'] }
    })

    expect(candidates[0]).toMatchObject({
      year: 1898,
      source: 'metadata',
      metadataLabel: 'Date'
    })
    expect(candidates[0].score).to.be.a('number')
  })

  test('returns undefined when no year can be found', () => {
    expect(
      findYearInIIIFResource({
        label: { none: ['Untitled map'] }
      })
    ).to.equal(undefined)
  })
})
