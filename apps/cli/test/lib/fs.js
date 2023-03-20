import fs from 'fs'
import path from 'path'
import url from 'url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const baseDir = path.join(__dirname, '..')
export const cliPath = path.join(baseDir, '..', 'dist', 'index.js')

export function readFile(filename) {
  return fs.readFileSync(path.join(baseDir, filename), 'utf8')
}

export function readFileJson(filename) {
  return JSON.parse(readFile(filename))
}
