import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import {
  generateGeotiffExample,
  generateSourceImageCommands
} from '../src/lib/examples/geotiff.ts'

const annotation = JSON.parse(
  await readFile(
    new URL(
      '../src/data/georeference-annotation-example.json',
      import.meta.url
    ),
    'utf8'
  )
)

test('GeoTIFF example generates valid Bash and identifies the required source image', async () => {
  const result = await generateGeotiffExample(annotation)
  assert.equal(result.mapCount, 1)
  assert.equal(result.images.length, 1)
  assert.equal(result.images[0].url, annotation.target.source.id)
  assert.equal(
    result.images[0].downloadUrl,
    `${annotation.target.source.id}/full/max/0/default.jpg`
  )
  assert.equal(result.images[0].width, annotation.target.source.width)
  assert.match(result.images[0].filename, /^[a-f0-9]{16}\.jpg$/)
  assert.ok(result.script.includes(result.images[0].filename))
  assert.match(result.script, /gdalwarp/)
  assert.match(result.script, /-of COG/)
  assert.match(result.script, /-cutline /)
  assert.equal(result.folds.length, 1)
  assert.equal(result.folds[0].startLine, 2)
  assert.equal(result.folds[0].collapsed, true)
  const lines = result.script.split('\n')
  assert.equal(lines[0], '#!/usr/bin/env bash')
  assert.match(lines[result.folds[0].endLine], /^gdal_translate /)
  assert.ok(
    !lines
      .slice(0, result.folds[0].endLine)
      .some((line) => line.startsWith('gdal_translate '))
  )
  const syntax = spawnSync('bash', ['-n'], {
    input: result.script,
    encoding: 'utf8'
  })
  assert.equal(syntax.status, 0, syntax.stderr)
})

test('an Annotation Page generates multiple maps and lists a shared image only once', async () => {
  const second = structuredClone(annotation)
  second.id = 'https://annotations.allmaps.org/maps/0123456789abcdef'
  const result = await generateGeotiffExample({
    type: 'AnnotationPage',
    items: [annotation, second]
  })
  assert.equal(result.mapCount, 2)
  assert.equal(result.images.length, 1)
  assert.equal((result.script.match(/gdalwarp \\\n/g) ?? []).length, 2)
  assert.match(result.script, /merged\.vrt/)
})

test('empty and invalid annotations do not produce a downloadable script', async () => {
  await assert.rejects(
    generateGeotiffExample({ type: 'AnnotationPage', items: [] }),
    /does not contain any georeferenced maps/
  )
  await assert.rejects(generateGeotiffExample({}))
})

test('full-resolution links use the IIIF image service version', async () => {
  for (const [type, suffix] of [
    ['ImageService1', 'full/full/0/native.jpg'],
    ['ImageService2', 'full/full/0/default.jpg'],
    ['ImageService3', 'full/max/0/default.jpg']
  ]) {
    const versioned = structuredClone(annotation)
    versioned.target.source.type = type
    versioned.target.source.id += '/'
    const result = await generateGeotiffExample(versioned)
    assert.equal(
      result.images[0].downloadUrl,
      `${annotation.target.source.id}/${suffix}`
    )
  }
})

test('download commands preserve the annotation URL as a single shell argument', () => {
  const url =
    "https://example.org/annotation?name='&value=$(printf substituted)"
  const commands = generateSourceImageCommands(url)
  for (const command of Object.values(commands)) {
    const syntax = spawnSync('bash', ['-n'], {
      input: command,
      encoding: 'utf8'
    })
    assert.equal(syntax.status, 0, syntax.stderr)
  }
  const execution = spawnSync(
    'bash',
    [
      '-c',
      `
curl() { printf '%s' "\${@: -1}"; }
allmaps() { cat; }
${commands.imageIds}
  `
    ],
    { encoding: 'utf8' }
  )
  assert.equal(execution.status, 0, execution.stderr)
  assert.equal(execution.stdout, url)
  assert.match(commands.download, /allmaps fetch full-image$/)
  assert.match(
    commands.dezoomify,
    /allmaps script dezoomify > download-images\.sh/
  )
})
