import path from 'path'

import { describe, it } from 'mocha'
import chai, { expect } from 'chai'
import shallowDeepEqual from 'chai-shallow-deep-equal'

import { inputDir, readJSONFile } from './test.js'
import { parseAnnotation, generateAnnotation } from '../dist/index.js'

chai.use(shallowDeepEqual)

const annotationFilename = 'annotation.i7YhWu1sFExRzm3d.json'
const mapFilename = 'map.nagwjzJ6qURmPEHV.json'

describe('Generating an annotation from a parsed annotation', () => {
  const annotation = readJSONFile(path.join(inputDir, annotationFilename))
  const maps = parseAnnotation(annotation)

  const map = maps[0]
  const generatedAnnotation = generateAnnotation(map)

  it('Annotation should equal generated annotation', () => {
    expect(annotation).to.shallowDeepEqual(generatedAnnotation)
  })
})

describe('Parsing a generated annotation', () => {
  const map = readJSONFile(path.join(inputDir, mapFilename))
  const annotation = generateAnnotation(map)

  const parsedMaps = parseAnnotation(annotation)
  const parsedMap = parsedMaps[0]

  it('Map should equal parsed map', () => {
    expect(map).to.shallowDeepEqual(parsedMap)
  })
})
