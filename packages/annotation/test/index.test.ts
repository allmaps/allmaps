import fs from 'node:fs'
import path from 'node:path'

import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'

import { describe, expect, test } from 'vitest'

import { inputDir, outputDir, readJSONFile } from './shared.js'

import { parseAnnotation, generateAnnotation } from '../src/index.js'

type TestFile = {
  type: string
  basename: string
  input: unknown
  output: unknown
  error: unknown
  errorMessage?: string
  expected: {
    output: unknown
    errorMessage: string
  }
}

fs.readdirSync(inputDir)
  .filter((filename: string) => filename.endsWith('.json'))
  .map((filename: string): TestFile => {
    const basename = path.basename(filename, '.json')

    const match = /(?<type>\w+)\.(?<id>.+)/.exec(basename)

    let type: string | undefined
    if (match) {
      const { groups: { type: matchedType } = {} } = match
      type = matchedType
    }

    if (!type || !['annotation', 'map'].includes(type)) {
      throw new Error(`${basename}: invalid type`)
    }

    const parsedType = type === 'annotation' ? 'map' : 'annotation'

    const inputFilename = path.join(inputDir, `${basename}.json`)
    const outputFilename = path.join(
      outputDir,
      `${basename}.${parsedType}.json`
    )
    const errorsFilename = path.join(outputDir, `${basename}.errors.json`)

    const input = readJSONFile(inputFilename)

    let output
    let error
    let errorMessage

    try {
      if (type === 'map') {
        output = generateAnnotation(input)
      } else if (type === 'annotation') {
        output = parseAnnotation(input)
      }
    } catch (err) {
      error = err

      if (err instanceof z.ZodError) {
        const validationError = fromZodError(err)
        errorMessage = validationError.message
      } else if (err instanceof Error) {
        errorMessage = err.message
      } else {
        errorMessage = String(err)
      }
    }

    let expectedOutput
    let expectedErrorMessage

    try {
      expectedOutput = readJSONFile(outputFilename)
    } catch {
      // Can't open outputFilename
      // Don't report/throw error here
    }

    try {
      expectedErrorMessage = readJSONFile(errorsFilename)
    } catch {
      // Can't open errorsFilename
      // Don't report/throw error here
    }

    return {
      type,
      basename,
      input,
      output,
      error,
      errorMessage,
      expected: {
        output: expectedOutput,
        errorMessage: expectedErrorMessage
      }
    }
  })
  .forEach(runTests)

function runTests(file: TestFile) {
  describe(file.basename, () => {
    if (file.output && file.expected.output) {
      test('should match expected output', () => {
        expect(file.output).toMatchObject(file.expected.output as object)
      })
    } else if (file.errorMessage && file.expected.errorMessage) {
      // TODO: test line numbers with json-source-map?

      test('should result in the correct error message', () => {
        expect(file.errorMessage).toEqual(file.expected.errorMessage)
      })
    } else if (file.output && file.expected.errorMessage) {
      console.error(
        'File parsed correctly, but expected errors:',
        file.basename
      )
    } else if (file.errorMessage && file.expected.output) {
      console.error(
        'File failed to parse, but expected no errors:',
        file.basename
      )
    } else {
      console.error(
        'Input file should have either matching output or errors JSON file:\n  ',
        file.basename
      )
    }
  })
}
