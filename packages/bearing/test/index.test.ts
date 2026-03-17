import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import { computeGeoreferencedMapBearing } from '../src/index.js'

export const inputDir = './test/input'

export function readJSONFile(filename: string) {
  return JSON.parse(fs.readFileSync(filename, 'utf-8'))
}

describe('Bearing', () => {
  test('GeoreferencedMap: no info, warnings or errors', () => {
    const georeferencedMap = readJSONFile(
      path.join(inputDir, 'georeferenced-map.json')
    )

    const bearing = computeGeoreferencedMapBearing(georeferencedMap)

    expect(bearing).to.equal(-45.56119258566859)
  })
})
