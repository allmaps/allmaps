#!/usr/bin/env node

// @ts-check

import url from 'url'
import path from 'path'
import { readdir, readFile, writeFile } from 'fs/promises'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const packagesDir = path.join(__dirname, '../../../packages')
const outputDir = path.join(__dirname, '../src/content/docs/reference/packages')

function isReadmeValid(readme) {
  return readme.length > 150
}

const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

const removeFirstLine = (lines) => lines.substring(lines.indexOf('\n') + 1)

for (const packageName of await getDirectories(packagesDir)) {
  const readmePath = path.join(packagesDir, packageName, 'README.md')
  const readme = await readFile(readmePath, { encoding: 'utf8' })

  if (!isReadmeValid(readme)) {
    console.log('Skipping README.md from', readmePath)
    continue
  }

  console.log('Copying README.md from', readmePath)

  const newReadme =
    `---
title: '@allmaps/${packageName}'
description: lees uit package.json
---\n` + removeFirstLine(readme)

  const outputPath = path.join(outputDir, `${packageName}.md`)

  await writeFile(outputPath, newReadme, { encoding: 'utf8' })
}
