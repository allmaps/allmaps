import path from 'path'

import { describe, expect, test } from 'vitest'

import { inputDir, readJSONFile } from './shared.js'
import { parseAnnotation, generateAnnotation } from '../src/index.js'

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
