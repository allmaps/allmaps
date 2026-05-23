import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const baseDir = path.join(__dirname, '..')

export const cliPath = [
  'node',
  path.join(baseDir, '..', 'src', 'index.ts')
].join(' ')

export function readFile(filename: string) {
  return fs.readFileSync(path.join(baseDir, filename), 'utf8')
}

export function readFileJson(filename: string) {
  return JSON.parse(readFile(filename))
}
