import fs from 'node:fs'
import path from 'node:path'

import { z } from 'zod'

import { describe, expect, test } from 'vitest'

import { IIIF } from '../src/index.js'

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
      if (err instanceof z.ZodError && err.errors) {
        errors = err.errors.map((error) => error.message)
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

export function readJSONFile(filename: string) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf-8'))
  } catch (err) {
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
