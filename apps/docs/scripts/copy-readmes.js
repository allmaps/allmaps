#!/usr/bin/env node

// @ts-check

import url from 'url'
import path from 'path'
import { readdir, readFile, writeFile } from 'fs/promises'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const packagesDir = path.join(__dirname, '../../../packages')
const outputDir = path.join(__dirname, '../src/content/docs/reference/packages')

function isReadmeValid(readme) {
  return readme && readme.length > 150
}

const getDirectories = async (source) =>
  (await readdir(source, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

const removeFirstLine = (lines) => lines.substring(lines.indexOf('\n') + 1)

for (const packageName of await getDirectories(packagesDir)) {
  const readmePath = path.join(packagesDir, packageName, 'README.md')

  let readme
  try {
    readme = await readFile(readmePath, { encoding: 'utf8' })
  } catch (err) {
    // ignore
  }

  if (!isReadmeValid(readme)) {
    console.log('Skipping README.md from', readmePath)
    continue
  }

  let description
  try {
    const packageFilename = path.join(packagesDir, packageName, 'package.json')
    const packageModule = await import(packageFilename, {
      assert: { type: 'json' }
    })
    description = packageModule.default.description
  } catch (err) {
    // ignore
  }

  console.log('Copying README.md from', readmePath)

  const newReadme =
    `---
title: '@allmaps/${packageName}'
description: ${description}
---\n` + removeFirstLine(readme)

  const outputPath = path.join(outputDir, `${packageName}.md`)

  await writeFile(outputPath, newReadme, { encoding: 'utf8' })
}
