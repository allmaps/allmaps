import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { inputDir, outputDir, readJSONFile } from './shared.js'

import { parseAnnotation, generateAnnotation } from '../dist/index.js'

chai.use(shallowDeepEqual)

fs.readdirSync(inputDir)
  .filter((filename) => filename.endsWith('.json'))
  .map((filename) => {
    const basename = path.basename(filename, '.json')

    const {
      groups: { type }
    } = /(?<type>\w+)\.(?<id>.+)/.exec(basename)

    if (!['annotation', 'map'].includes(type)) {
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
      } else {
        errorMessage = err.message
      }
    }

    let expectedOutput
    let expectedErrorMessage

    try {
      expectedOutput = readJSONFile(outputFilename)
    } catch (err) {
      // Can't open outputFilename
      // Don't report/throw error here
    }

    try {
      expectedErrorMessage = readJSONFile(errorsFilename)
    } catch (err) {
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

function runTests(file) {
  describe(file.basename, () => {
    if (file.output && file.expected.output) {
      it('should match expected output', () => {
        // console.log('file.expected.output', file.expected.output)
        // console.log('file.output', file.output)
        expect(file.expected.output).to.shallowDeepEqual(file.output)
        // expect(file.expected.errors).to.deep.equal(file.errorMessage)
      })
    } else if (file.errorMessage && file.expected.errorMessage) {
      // TODO: test line numbers with json-source-map?

      it('should result in the correct error message', () => {
        // expect(file.expected.errors.sort()).to.deep.equal(file.errors.sort())
        expect(file.expected.errorMessage).to.deep.equal(file.errorMessage)
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
