import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'

import { execFilename } from './lib/exec.js'

describe('GeoTIFF script image dimensions', () => {
  let script: string

  beforeAll(() => {
    script = execFilename(
      'script geotiff',
      'input/annotations/c969e4bba21381cf.json'
    )
  })

  function runScript(imageInfo: string, gdalinfoStatus = 0) {
    const directory = mkdtempSync(join(tmpdir(), 'allmaps-geotiff-'))

    try {
      writeFileSync(join(directory, 'c21d3a8cff2ff76f.jpg'), '')

      const result = spawnSync('/bin/bash', ['--noprofile', '--norc'], {
        cwd: directory,
        encoding: 'utf8',
        env: {
          // Only the mocked commands and Bash builtins are available, not jq.
          PATH: directory,
          IMAGE_INFO: imageInfo,
          GDALINFO_STATUS: String(gdalinfoStatus)
        },
        input: `
mkdir() { :; }
gdalinfo() {
  printf '%s\\n' "$*" >> gdalinfo-calls
  printf '%s\\n' "$IMAGE_INFO"
  return "$GDALINFO_STATUS"
}
gdal_translate() { echo 'Running gdal_translate'; }
gdalwarp() { :; }
gdalbuildvrt() { :; }
${script}`
      })

      expect(result.error).toBeUndefined()
      expect(readFileSync(join(directory, 'gdalinfo-calls'), 'utf8')).toBe(
        '-json ./c21d3a8cff2ff76f.jpg\n'
      )
      return result
    } finally {
      rmSync(directory, { recursive: true, force: true })
    }
  }

  test.each([
    ['compact JSON', '{"size":[5207,7446]}'],
    ['pretty JSON', '{\n  "size": [\n    5207,\n    7446\n  ]\n}'],
    ['tabs and CRLF', '{\r\n\t"size"\t:\t[\r\n5207,\t7446\r\n]\r\n}'],
    [
      'overview dimensions after the image dimensions',
      '{"size":[5207,7446],"bands":[{"overviews":[{"size":[2604,3723]}]}]}'
    ]
  ])('reads dimensions from %s without jq', (_, imageInfo) => {
    const result = runScript(imageInfo)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe('')
    expect(result.stdout).toContain('Found image with correct size:')
    expect(result.stdout).toContain('Running gdal_translate')
  })

  test('rejects incorrect image dimensions before conversion', () => {
    const result = runScript('{"size":[100,200]}')

    expect(result.status).toBe(1)
    expect(result.stdout).toContain('Error: found image with incorrect size')
    expect(result.stdout).toContain('Found: 100 x 200')
    expect(result.stdout).not.toContain('Running gdal_translate')
  })

  test.each([
    '{}',
    '{"size":[5207]}',
    '{"size":[5207,7446,1]}',
    '{"size":["5207","7446"]}',
    '{"size":[-5207,7446]}'
  ])('rejects missing or unsupported dimensions in %s', (imageInfo) => {
    const result = runScript(imageInfo)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Error: could not read image dimensions:')
    expect(result.stdout).not.toContain('Running gdal_translate')
  })

  test('stops when gdalinfo fails even if its output contains dimensions', () => {
    const result = runScript('{"size":[5207,7446]}', 1)

    expect(result.status).toBe(1)
    expect(result.stdout).not.toContain('Running gdal_translate')
  })
})
