import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { inputDir, readJSONFile } from './shared.js'
import {
  Annotation0Schema,
  Annotation1Schema,
  parseAnnotation,
  generateAnnotation
} from '../src/index.js'

const annotationFilename = 'annotation.parse-generate.json'
const mapFilename = 'map.parse-generate.json'

describe('Generating an annotation from a parsed annotation', () => {
  test('Annotation should equal generated annotation', () => {
    const annotation = readJSONFile(path.join(inputDir, annotationFilename))
    const maps = parseAnnotation(annotation)

    const map = maps[0]
    const generatedAnnotation = generateAnnotation(map)

    expect(generatedAnnotation).toMatchObject(annotation as object)
  })
})

describe('Parsing a generated annotation', () => {
  test('Map should equal parsed map', () => {
    const map = readJSONFile(path.join(inputDir, mapFilename))
    const annotation = generateAnnotation(map)

    const parsedMaps = parseAnnotation(annotation)
    const parsedMap = parsedMaps[0]

    expect(parsedMap).toMatchObject(map as object)
  })
})

describe('Parsing provider homepages', () => {
  test('Invalid homepage URLs should be omitted', () => {
    const map = readJSONFile(path.join(inputDir, mapFilename)) as {
      resource: {
        provider?: unknown
      }
    }

    map.resource.provider = [
      {
        label: { none: ['Example Organization'] },
        homepage: [
          { id: 'https://example.org/' },
          { id: 'example.org' },
          { id: 'not a url' }
        ]
      }
    ]

    const annotation = generateAnnotation(map)

    expect(annotation).toMatchObject({
      target: {
        source: {
          provider: [
            {
              homepage: [{ id: 'https://example.org/' }]
            }
          ]
        }
      }
    })
  })

  test('Invalid annotation homepage URLs should be omitted', () => {
    const map = readJSONFile(path.join(inputDir, mapFilename))
    const annotation = generateAnnotation(map) as {
      target: {
        source: {
          provider?: unknown
        }
      }
    }

    annotation.target.source.provider = [
      {
        label: { none: ['Example Organization'] },
        homepage: [
          { id: 'https://example.org/' },
          { id: 'example.org' },
          { id: 'not a url' }
        ]
      }
    ]

    const parsedMaps = parseAnnotation(annotation)

    expect(parsedMaps[0]).toMatchObject({
      resource: {
        provider: [
          {
            homepage: [{ id: 'https://example.org/' }]
          }
        ]
      }
    })
  })
})

describe('Generating annotations with invalid resource dimensions', () => {
  test('Non-positive resource dimensions should be omitted', () => {
    const map = readJSONFile(path.join(inputDir, mapFilename)) as {
      resource: {
        width: number
        height: number
      }
    }

    map.resource.width = 0
    map.resource.height = 0

    const annotation = generateAnnotation(map) as {
      target: {
        source: {
          width?: number
          height?: number
        }
        selector: {
          value: string
        }
      }
    }

    const serializedSource = JSON.parse(
      JSON.stringify(annotation.target.source)
    )

    expect(annotation.target.source.width).toBeUndefined()
    expect(annotation.target.source.height).toBeUndefined()
    expect(serializedSource).not.toHaveProperty('width')
    expect(serializedSource).not.toHaveProperty('height')
    expect(annotation.target.selector.value).toBe(
      '<svg><polygon points="117,120 113,1776 4587,1772 4568,101" /></svg>'
    )
  })
})

describe('Parsing annotations without motivation', () => {
  test('Version 0 schema should preserve omission', () => {
    const annotation = readJSONFile(
      path.join(inputDir, 'annotation.motivation-missing.json')
    ) as Record<string, unknown>

    const parsedAnnotation = Annotation0Schema.parse(annotation)

    expect(parsedAnnotation).not.toHaveProperty('motivation')
    expect(parseAnnotation(annotation)).toHaveLength(1)
  })

  test('Version 1 schema should preserve omission', () => {
    const annotation = readJSONFile(
      path.join(inputDir, 'annotation.canvas-target-motivation-missing.json')
    ) as Record<string, unknown>

    const parsedAnnotation = Annotation1Schema.parse(annotation)

    expect(parsedAnnotation).not.toHaveProperty('motivation')
    expect(parseAnnotation(annotation)).toHaveLength(1)
  })
})
