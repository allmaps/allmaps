import { afterEach, expect, it, vi } from 'vitest'

import { copyPublishedAnnotation } from '../src/lib/shared/map-actions.js'

afterEach(() => vi.unstubAllGlobals())

const url = 'https://annotations.allmaps.org/manifests/example'
const page = {
  type: 'AnnotationPage',
  items: [{ id: 'first' }, { id: 'second' }]
}

it('starts the clipboard write during activation and supplies the full response', async () => {
  const response = Promise.withResolvers<Response>()
  vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise))
  class ClipboardItem {
    constructor(readonly parts: Record<string, Promise<Blob>>) {}
  }
  vi.stubGlobal('ClipboardItem', ClipboardItem)
  let copied: string | undefined
  const write = vi.fn(async ([item]: ClipboardItem[]) => {
    copied = await (await item.parts['text/plain']).text()
  })
  vi.stubGlobal('navigator', { clipboard: { write } })

  const copying = copyPublishedAnnotation(url)
  expect(write).toHaveBeenCalledOnce()
  response.resolve(Response.json(page))
  await copying
  expect(JSON.parse(copied!)).toEqual(page)
})

it('keeps the clipboard intact and propagates a failed request on the text fallback', async () => {
  vi.stubGlobal('ClipboardItem', undefined)
  const writeText = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { writeText } })
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response(null, { status: 404 }))
  )

  await expect(copyPublishedAnnotation(url)).rejects.toThrow()
  expect(writeText).not.toHaveBeenCalled()
})
