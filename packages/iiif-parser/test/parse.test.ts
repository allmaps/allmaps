import fs from 'node:fs'
import path from 'node:path'

import { z } from 'zod'

import { describe, expect, test } from 'vitest'

import { IIIF, Manifest } from '../src/index.js'

const inputDir = './test/input'
const outputDir = './test/output'

type TestFile = {
  basename: string
  parsedIiif: unknown
  input: unknown
  output: unknown
  errors: string[]
  zodError?: z.ZodError
  expected: {
    output: unknown
    // errorMessage: string
    errors: string[]
  }
}

fs.readdirSync(inputDir)
  .filter((filename: string) => filename.endsWith('.json'))
  .map((filename: string): TestFile => {
    const basename = path.basename(filename, '.json')

    const inputFilename = path.join(inputDir, `${basename}.json`)
    const parsedFilename = path.join(outputDir, `${basename}.parsed.json`)
    const errorFilename = path.join(outputDir, `${basename}.error.json`)

    const input = readJSONFile(inputFilename)

    let output
    let parsedIiif
    let errors: string[]
    let zodError

    try {
      parsedIiif = IIIF.parse(input)

      // Make sure Date objects in parsed IIIF data are converted to strings
      output = JSON.parse(JSON.stringify({ ...parsedIiif }))
      errors = []
    } catch (err) {
      if (err instanceof z.ZodError) {
        errors = err.issues.map((error) => error.message)
        zodError = err
      } else if (err instanceof Error) {
        errors = [err.message]
      } else {
        errors = []
      }
    }

    return {
      basename,
      input,
      parsedIiif,
      output,
      errors,
      zodError,
      expected: {
        output: readJSONFile(parsedFilename),
        errors: readJSONFile(errorFilename)
      }
    }
  })
  .forEach(runTests)

describe('Parsing image service arrays in Presentation 2 manifests', () => {
  const auth = {
    '@id': 'https://example.org/login',
    profile: 'http://iiif.io/api/auth/1/login'
  }

  function parseWithServices(services: unknown[]) {
    const manifest = readJSONFile(
      path.join(inputDir, 'manifest.2.leiden-130206.json')
    )
    manifest.sequences[0].canvases[0].images[0].resource.service = services
    return Manifest.parse(manifest)
  }

  test('keeps both supported image services alongside an authentication service', () => {
    const v2 = {
      '@id': 'https://example.org/iiif/2/map',
      profile: 'http://iiif.io/api/image/2/level2.json'
    }
    const v3 = {
      id: 'https://example.org/iiif/3/map',
      type: 'ImageService3',
      profile: 'level2'
    }
    const image = parseWithServices([v2, auth, v3]).canvases[0].image
    expect(image.uri).toBe(v3.id)
    expect(image.serviceUris).toEqual([v3.id, v2['@id']])
  })

  test.each([
    { name: 'only unsupported services', services: [auth] },
    { name: 'no services', services: [] }
  ])('rejects an array with $name during validation', ({ services }) => {
    expect(() => parseWithServices(services)).toThrow(z.ZodError)
  })
})

describe('Parsing summaries in Presentation 3 manifests', () => {
  test.each([
    { summary: [['dendermonde']], expectedSummary: undefined },
    {
      summary: { none: ['dendermonde'] },
      expectedSummary: { none: ['dendermonde'] }
    }
  ])(
    'should parse a manifest with summary $summary',
    ({ summary, expectedSummary }) => {
      const manifest = readJSONFile(
        path.join(inputDir, 'manifest.3.jd-03909-006-4.json')
      )
      manifest.summary = summary
      manifest.items[0].summary = summary

      const parsedManifest = IIIF.parse(manifest)

      if (parsedManifest.type !== 'manifest') {
        throw new Error('Expected fixture to parse as manifest')
      }

      expect(parsedManifest.summary).to.deep.equal(expectedSummary)
      expect(parsedManifest.canvases).to.have.length(manifest.items.length)
      expect(parsedManifest.canvases[0].summary).to.deep.equal(expectedSummary)
      expect(parsedManifest.canvases[0].image.uri).to.equal(
        manifest.items[0].items[0].items[0].body.service[0].id
      )
    }
  )
})

describe('Parsing georeference annotation pages in Presentation 3 manifests', () => {
  test('should preserve embedded and linked canvas annotation pages', () => {
    const embeddedManifest = IIIF.parse(
      readJSONFile(
        path.join(
          inputDir,
          'manifest.3.pica-toegankelijke-kaartcollectie-embedded-annotations.json'
        )
      )
    )
    const linkedManifest = IIIF.parse(
      readJSONFile(
        path.join(inputDir, 'manifest.3.pica-toegankelijke-kaartcollectie.json')
      )
    )

    if (embeddedManifest.type !== 'manifest') {
      throw new Error('Expected embedded fixture to parse as manifest')
    }

    if (linkedManifest.type !== 'manifest') {
      throw new Error('Expected linked fixture to parse as manifest')
    }

    expect(
      embeddedManifest.canvases.every((canvas) =>
        canvas.annotations?.some(
          (annotationPage) => annotationPage.items?.length
        )
      )
    ).toBe(true)

    expect(
      linkedManifest.canvases.every((canvas) =>
        canvas.annotations?.some(
          (annotationPage) =>
            annotationPage.id &&
            annotationPage.type === 'AnnotationPage' &&
            !annotationPage.items
        )
      )
    ).toBe(true)
  })
})

export function readJSONFile(filename: string) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf-8'))
  } catch {
    return undefined
  }
}

function runTests(file: TestFile) {
  describe(`Parsing ${file.basename}`, () => {
    if (file.output && file.expected.output) {
      test('should match expected output', () => {
        expect(file.expected.output).to.deep.equal(file.output)
      })
    } else if (file.errors && file.expected.errors) {
      test('should result in the correct error message', () => {
        expect(file.expected.errors.sort()).to.deep.equal(file.errors.sort())
      })
    } else if (file.output && file.expected.errors) {
      test('should not parse', () => {
        throw new Error(file.expected.errors.join('\n'))
        // done(new Error(file.expected.errors))
      })
    } else if (file.errors && file.expected.output) {
      test('should parse correctly', () => {
        let message

        if (file.zodError) {
          message = JSON.stringify(file.zodError.issues, null, 2)
        } else {
          message = file.errors[0]
        }

        throw new Error(message)
        // done(new Error(message))
      })
    } else {
      test('should have a matching output or errors JSON file', () => {
        // done(
        //   new Error(
        //     `File not found "${file.basename}.parsed.json" or "${file.basename}.errors.json"`
        //   )
        // )
      })
    }
  })
}
