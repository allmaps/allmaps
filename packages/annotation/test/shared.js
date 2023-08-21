import fs from 'fs'

export const inputDir = './test/input'
export const outputDir = './test/output'

export function readJSONFile(filename) {
  return JSON.parse(fs.readFileSync(filename))
}
