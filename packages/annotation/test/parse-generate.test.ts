import path from 'path'

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
