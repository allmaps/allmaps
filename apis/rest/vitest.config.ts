import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { defineConfig } from 'vitest/config'

const packagesDirectory = fileURLToPath(
  new URL('../../packages', import.meta.url)
)
const aliases: { find: RegExp; replacement: string }[] = []

for (const directory of readdirSync(packagesDirectory)) {
  const packageDirectory = path.join(packagesDirectory, directory)
  const manifestPath = path.join(packageDirectory, 'package.json')
  if (!existsSync(manifestPath)) {
    continue
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

  const exports =
    typeof manifest.exports === 'string'
      ? { '.': manifest.exports }
      : (manifest.exports ?? {})

  for (const [subpath, target] of Object.entries(exports)) {
    if (typeof target !== 'string' || !target.startsWith('./dist/')) {
      continue
    }

    const name = manifest.name + (subpath === '.' ? '' : subpath.slice(1))
    const source = path.join(
      packageDirectory,
      target.replace('./dist/', './src/').replace(/\.js$/, '.ts')
    )
    aliases.push({
      find: new RegExp(`^${name.replace('*', '(.+)')}$`),
      replacement: source.replace('*.ts', '$1')
    })
  }
}

export default defineConfig({
  resolve: {
    alias: aliases
  },
  test: { include: ['test/**/*.test.ts'] }
})
