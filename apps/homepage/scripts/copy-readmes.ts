import url from 'url'
import path from 'path'
import { readdir, readFile, writeFile } from 'fs/promises'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const packagesDir = path.join(__dirname, '../../../packages')
const outputDir = path.join(__dirname, '../src/content/docs/docs/packages')

/**
 * Function to check if a README.md file is valid.
 * @param readme - Contents of the README.md file
 * @returns - Whether the README.md file is valid
 */
function isReadmeValid(readme: string) {
  return readme.length > 150
}

/**
 * Get the directories in a directory.
 * @param source
 * @returns - The directories in the source directory
 */
async function getDirectories(source: string) {
  const dirent = await readdir(source, { withFileTypes: true })

  return dirent
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
}

/**
 * Remove the first line of a string.
 * @param lines
 * @returns - The string without the first line
 */
function removeFirstLine(lines: string) {
  if (!lines) {
    return ''
  }

  return lines.substring(lines.indexOf('\n') + 1)
}

for (const packageName of await getDirectories(packagesDir)) {
  const readmePath = path.join(packagesDir, packageName, 'README.md')

  let readme = ''
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
