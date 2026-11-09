import url from 'url'
import path from 'path'
import { mkdir, readdir, readFile, writeFile } from 'fs/promises'
import { rewriteReadmeLinks } from './readme-links.ts'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const packagesDir = path.join(__dirname, '../../../packages')
const repositoryRoot = path.join(__dirname, '../../..')
const outputDir = path.join(__dirname, '../src/content/docs')

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

await mkdir(path.join(outputDir, 'packages'), { recursive: true })

const readmes = new Map<
  string,
  { readme: string; readmePath: string; title: string; route: string }
>()

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

  readmes.set(`packages/${packageName}`, {
    readme,
    readmePath,
    title: `@allmaps/${packageName}`,
    route: `/packages/${packageName}`
  })
}

// Include package references whose source workspaces live outside packages/.
for (const [directory, title, route] of [
  ['apps/cli', '@allmaps/cli', '/packages/cli'],
  ['workers/tileserver', '@allmaps/tileserver', '/packages/tileserver']
]) {
  const readmePath = path.join(repositoryRoot, directory, 'README.md')
  const readme = await readFile(readmePath, 'utf8')
  readmes.set(directory, { readme, readmePath, title, route })
}

// Resolve links only after knowing which READMEs will be published.
const readmeRoutes = new Map(
  [...readmes].map(([directory, { route }]) => [directory, route])
)

for (const { readme, readmePath, title, route } of readmes.values()) {
  let description
  try {
    const packageFilename = path.join(path.dirname(readmePath), 'package.json')
    const packageModule = await import(packageFilename, {
      with: { type: 'json' }
    })
    description = packageModule.default.description
  } catch (err) {
    // ignore
  }

  console.log('Copying README.md from', readmePath)

  const newReadme =
    `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description ?? '')}
---\n` +
    rewriteReadmeLinks(removeFirstLine(readme), {
      repositoryRoot,
      readmePath,
      readmeRoutes
    })

  const outputPath = path.join(outputDir, `${route.slice(1)}.md`)

  await writeFile(outputPath, newReadme, { encoding: 'utf8' })
}
