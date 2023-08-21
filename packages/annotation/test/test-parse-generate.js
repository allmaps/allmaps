import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { inputDir, readJSONFile } from './shared.js'
import { parseAnnotation, generateAnnotation } from '../dist/index.js'

chai.use(shallowDeepEqual)

const annotationFilename = 'annotation.parse-generate.json'
const mapFilename = 'map.parse-generate.json'

describe('Generating an annotation from a parsed annotation', () => {
  it('Annotation should equal generated annotation', () => {
    const annotation = readJSONFile(path.join(inputDir, annotationFilename))
    const maps = parseAnnotation(annotation)

    const map = maps[0]
    const generatedAnnotation = generateAnnotation(map)

    expect(annotation).to.shallowDeepEqual(generatedAnnotation)
  })
})

describe('Parsing a generated annotation', () => {
  it('Map should equal parsed map', () => {
    const map = readJSONFile(path.join(inputDir, mapFilename))
    const annotation = generateAnnotation(map)

    const parsedMaps = parseAnnotation(annotation)
    const parsedMap = parsedMaps[0]

    expect(map).to.shallowDeepEqual(parsedMap)
  })
})
