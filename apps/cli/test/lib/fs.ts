import fs from 'node:fs'
import path from 'node:path'
import url from 'node:url'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export const baseDir = path.join(__dirname, '..')

// TODO: run TS instead of built version
export const cliPath = path.join(baseDir, '..', 'dist', 'index.js')

export function readFile(filename: string) {
  return fs.readFileSync(path.join(baseDir, filename), 'utf8')
}

export function readFileJson(filename: string) {
  return JSON.parse(readFile(filename))
}
