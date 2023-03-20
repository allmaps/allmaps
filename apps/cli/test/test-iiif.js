import { expect } from 'chai'
import 'mocha'

import { exec, execJson } from './lib/exec.js'
import { readFileJson } from './lib/fs.js'
import { helpMessage } from './lib/help.js'

describe('allmaps iiif', () => {
  it('should display help when no arguments are provided', () => {
    expect(() => exec('iiif')).to.throw(helpMessage('iiif'))
  })

  it('should display help when incorrect command is provided', () => {
    expect(() => exec('iiif incorrect')).to.throw(helpMessage('iiif-incorrect'))
  })
})

describe('allmaps iiif manifest', () => {
  it('should read multiple IIIF Resources from the standard input and create a new Manifest that contains all Images from all input IIIF Resources', () => {
    const expected = readFileJson('output/iiif/new-manifest-1.json')
    const output = execJson(
      'iiif manifest --id https://test.allmaps.org/manifest/1 input/iiif/manifest.2.loc-87694060.json input/iiif/image.2.stanford-tc010rc2373-PaloAlto3.json'
    )
    expect(expected).to.deep.equal(output)
  })
})

describe('allmaps iiif parse', () => {
  it("should read a IIIF Manifest from the standard input and convert the Manifest to Allmaps' internal format", () => {
    const expected = readFileJson(
      'output/iiif/manifest.2.stanford-tc010rc2373.parsed.json'
    )
    const output = execJson(
      'iiif parse',
      'input/iiif/manifest.2.stanford-tc010rc2373.json'
    )

    expect(expected).to.deep.equal(output)
  })
})
