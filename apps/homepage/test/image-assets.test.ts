import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, test, vi } from 'vitest'
import sharp from 'sharp'
import { imageHash, publishImages } from '../scripts/image-assets.ts'

const directories: string[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'allmaps-image-assets-'))
  directories.push(directory)
  const data = await sharp({
    create: { width: 10, height: 6, channels: 3, background: '#abcdef' }
  })
    .webp()
    .toBuffer()
  const filename = join(directory, 'image.webp')
  const cli = join(directory, 'assets.mjs')
  const argumentsPath = join(directory, 'arguments.json')
  const key = 'images/screenshots/example/v1-10w.webp'
  const url = `https://files.allmaps.org/${key}`
  await writeFile(filename, data)
  await writeFile(
    cli,
    `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(argumentsPath)}, JSON.stringify(process.argv.slice(2))); console.log(JSON.stringify(${JSON.stringify({ ok: true, status: 'complete', publicUrl: url })}));`
  )
  return {
    data,
    cli,
    argumentsPath,
    input: { name: 'example.webp', filename, key },
    url
  }
}

test('uploads an exact immutable key and checks the published bytes', async () => {
  const { data, cli, argumentsPath, input, url } = await fixture()
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(new Response('', { status: 404 }))
    .mockResolvedValueOnce(new Response(new Uint8Array(data)))
  vi.stubGlobal('fetch', fetch)
  const result = await publishImages([input], cli)
  expect(result[input.name]).toEqual({
    url,
    width: 10,
    height: 6,
    sha256: imageHash(data)
  })
  expect(JSON.parse(await readFile(argumentsPath, 'utf8'))).toEqual([
    'upload',
    'file',
    input.filename,
    '--key',
    input.key,
    '--content-type',
    'image/webp'
  ])
  const checkUrl = new URL(fetch.mock.calls[0][0])
  expect(checkUrl.origin + checkUrl.pathname).toBe(url)
  expect(checkUrl.searchParams.get('check')).toMatch(/^[a-f0-9-]+$/)
  expect(fetch.mock.calls[0][0]).not.toBe(url)
  expect(fetch.mock.calls[1][0]).toBe(`${url}?sha256=${imageHash(data)}`)
})

test('reuses identical published objects without calling the CLI', async () => {
  const { data, input, url } = await fixture()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(new Uint8Array(data)))
  )
  expect(
    (await publishImages([input], '/missing-assets-cli'))[input.name].url
  ).toBe(url)
})

test('refuses to overwrite an existing version with different bytes', async () => {
  const { input } = await fixture()
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('different image'))
  )
  await expect(
    publishImages([input], '/missing-assets-cli')
  ).rejects.toMatchObject({
    errors: [
      expect.objectContaining({
        message: expect.stringContaining('Choose a new version')
      })
    ]
  })
})

test('rejects publication when the served bytes do not match the source', async () => {
  const { input, cli } = await fixture()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('wrong bytes'))
  )
  await expect(publishImages([input], cli)).rejects.toMatchObject({
    errors: [
      expect.objectContaining({
        message: expect.stringContaining('verification failed')
      })
    ]
  })
})
