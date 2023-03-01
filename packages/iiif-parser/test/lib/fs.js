import url from 'url'
import fs from 'fs'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

export function readJson(filename) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'input', filename))
  )
}
