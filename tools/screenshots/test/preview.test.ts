import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { afterEach, expect, test, vi } from 'vitest'

import { previewModule, screenshotPreview } from '../src/preview.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function fixture(base = '/') {
  const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-preview-'))
  directories.push(directory)
  const preview = screenshotPreview(directory, base)
  return {
    directory,
    async request(url: string, method = 'GET') {
      const response = {
        statusCode: 200,
        setHeader: vi.fn(),
        end: vi.fn()
      }
      const next = vi.fn()
      await preview(
        { url, method } as IncomingMessage,
        response as unknown as ServerResponse,
        next
      )
      return { response, next }
    }
  }
}

const key = 'screenshots/editor-iiif-map/v1.webp'
const publishedUrl = `https://files.allmaps.org/${key}`
const previewUrl = `/__allmaps/${key}?fallback=${encodeURIComponent(publishedUrl)}`

test('serves a newly created capture after falling back, without restarting', async () => {
  const { directory, request } = await fixture()
  const missing = await request(previewUrl)
  expect(missing.response.statusCode).toBe(302)
  expect(missing.response.setHeader).toHaveBeenCalledWith(
    'Location',
    publishedUrl
  )
  expect(missing.response.setHeader).toHaveBeenCalledWith(
    'Cache-Control',
    'no-store'
  )

  const bytes = Buffer.from('local WebP fixture')
  await mkdir(path.dirname(path.join(directory, key)), { recursive: true })
  await writeFile(path.join(directory, key), bytes)
  const local = await request(previewUrl)
  expect(local.response.statusCode).toBe(200)
  expect(local.response.setHeader).toHaveBeenCalledWith(
    'Content-Type',
    'image/webp'
  )
  expect(local.response.setHeader).toHaveBeenCalledWith(
    'Cache-Control',
    'no-store'
  )
  expect(local.response.end).toHaveBeenCalledWith(bytes)
  expect(local.next).not.toHaveBeenCalled()

  const head = await request(previewUrl, 'HEAD')
  expect(head.response.setHeader).toHaveBeenCalledWith(
    'Content-Length',
    bytes.length
  )
  expect(head.response.end).toHaveBeenCalledWith(undefined)
})

test.each([
  '/__allmaps/screenshots/editor-iiif-map/v1.webp.json',
  '/__allmaps/screenshots/../../secret.webp',
  '/__allmaps/screenshots/%2e%2e%2fsecret.webp',
  '/__allmaps/screenshots/editor-iiif-map/v1.webp?fallback=javascript:alert(1)'
])('does not serve private files or unsafe redirects: %s', async (url) => {
  const { request } = await fixture()
  const { response } = await request(url)
  expect(response.statusCode).toBe(404)
  expect(response.setHeader).not.toHaveBeenCalledWith(
    'Location',
    expect.anything()
  )
})

test('respects the app base and leaves unrelated requests alone', async () => {
  const { request } = await fixture('/homepage/')
  const { next } = await request(previewUrl)
  expect(next).toHaveBeenCalledOnce()
  const { response } = await request(`/homepage${previewUrl}`)
  expect(response.statusCode).toBe(302)
  const module = previewModule('/homepage/').replace(
    'export function',
    'function'
  )
  const resolve = new Function(`${module}; return screenshotImageUrl`)()
  expect(resolve(key, publishedUrl)).toBe(`/homepage${previewUrl}`)
})

test('serves public geometry but never upload receipts or cache signatures', async () => {
  const { directory, request } = await fixture()
  const geometryKey = key.replace('.webp', '.geometry.json')
  await mkdir(path.dirname(path.join(directory, geometryKey)), {
    recursive: true
  })
  await writeFile(path.join(directory, geometryKey), '{"schemaVersion":1}')
  const { response } = await request(`/__allmaps/${geometryKey}`)
  expect(response.statusCode).toBe(200)
  expect(response.setHeader).toHaveBeenCalledWith(
    'Content-Type',
    'application/json'
  )
  for (const privateKey of [
    `${key}.json`,
    `${key}.upload.json`,
    `${geometryKey}.upload.json`
  ]) {
    expect(
      (await request(`/__allmaps/${privateKey}`)).response.statusCode
    ).toBe(404)
  }
})
