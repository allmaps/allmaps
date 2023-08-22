#!/usr/bin/env node

import url from 'url'
import path from 'path'
import { readdir, readFile, writeFile } from 'fs/promises'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const packagesDir = path.join(__dirname, '../../allmaps/packages')
const outputDir = path.join(__dirname, '../src/content/docs/reference/packages')

const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

const removeFirstLine = (lines) => lines.substring(lines.indexOf('\n') + 1)

for (const packageName of await getDirectories(packagesDir)) {
  const readmePath = path.join(packagesDir, packageName, 'README.md')
  const readme = await readFile(readmePath, { encoding: 'utf8' })

  const newReadme =
    `---
title: '@allmaps/${packageName}'
description: lees uit package.json
---\n` + removeFirstLine(readme)

  const outputPath = path.join(outputDir, `${packageName}.md`)

  await writeFile(outputPath, newReadme, { encoding: 'utf8' })
}
