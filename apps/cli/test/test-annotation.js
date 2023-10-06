import { describe, it } from 'mocha'
import { expect } from 'chai'

import { exec, execJson } from './lib/exec.js'
import { readFile, readFileJson } from './lib/fs.js'
import { helpMessage } from './lib/help.js'

describe('allmaps annotation', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('annotation')).to.throw(helpMessage('annotation'))
  })

  it('should display help when incorrect command is provided', () => {
    expect(() => exec('annotation incorrect')).to.throw(
      helpMessage('annotation-incorrect')
    )
  })
})

describe('allmaps annotation generate', () => {
  it("should read georeference data in Allmaps' internal format from a file and convert it to a Georeference Annotation", () => {
    const expected = readFileJson('output/annotations/5610333850638ae2.json')
    const output = execJson(
      'annotation generate input/maps/5610333850638ae2.json'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read georeference data in Allmaps' internal format from the standard input and convert it to a Georeference Annotation", () => {
    const expected = readFileJson('output/annotations/5610333850638ae2.json')
    const output = execJson(
      'annotation generate',
      'input/maps/5610333850638ae2.json'
    )

    expect(expected).to.deep.equal(output)
  })
})

describe('allmaps annotation parse', () => {
  it("should read a Georeference Annotation from a file and convert it to Allmaps' internal format", () => {
    const expected = readFileJson('output/maps/7a69f9470b49a744.json')
    const output = execJson(
      'annotation parse input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.deep.equal(output)
  })

  it("should read a Georeference Annotation from the standard input and convert it to Allmaps' internal format", () => {
    const expected = readFileJson('output/maps/7a69f9470b49a744.json')
    const output = execJson(
      'annotation parse',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.deep.equal(output)
  })
})

describe('allmaps annotation svg', () => {
  it('should read a Georeference Annotation from the standard input and convert its resource mask to an SVG polygon', () => {
    const expected = readFile('output/svg/7a69f9470b49a744.svg')
    const output = exec(
      'annotation svg',
      'input/annotations/7a69f9470b49a744.json'
    )

    expect(expected).to.equal(output)
  })
})
