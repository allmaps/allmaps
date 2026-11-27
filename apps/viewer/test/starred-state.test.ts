import { afterEach, expect, it, vi } from 'vitest'

import { StarredState } from '../src/lib/state/starred.svelte.js'

vi.mock('$lib/shared/auth.js', () => ({
  annotationsBaseUrl: 'https://annotations.example.test',
  restBaseUrl: 'https://api.example.test'
}))

const resource = { type: 'image', id: 'abcd' } as const
const list = {
  id: 'starred',
  name: 'Starred',
  deletable: false,
  url: 'https://annotations.example.test/@reader/lists/starred'
}

function saved(path = 'images/abcd') {
  return {
    id: list.url + '#' + path,
    allmapsUrl: 'https://annotations.example.test/' + path,
    created: '2026-01-01T00:00:00.000Z',
    georeferencedMapCount: 1,
    target: { id: 'https://example.test/image', 'dcterms:title': 'Sheet 1' }
  }
}

async function setup() {
  const request = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json([list]))
    .mockResolvedValueOnce(
      Response.json({
        id: list.url,
        georeferenceAnnotations: list.url + '/georeference-annotations',
        label: list.name,
        type: 'AnnotationCollection',
        total: 0
      })
    )
  vi.stubGlobal('fetch', request)
  const state = new StarredState()
  state.setAccount('reader')
  await state.load()
  request.mockClear()
  return { state, request }
}

afterEach(() => vi.unstubAllGlobals())

it('shows an undo immediately and sends it after the pending add', async () => {
  const { state, request } = await setup()
  const addResponse = Promise.withResolvers<Response>()
  request
    .mockReturnValueOnce(addResponse.promise)
    .mockResolvedValueOnce(new Response())
  const add = state.save(resource, true)
  expect(state.isStarred(resource)).toBe(true)
  expect(state.list?.items).toEqual([])
  const undo = state.save(resource, false)
  expect(state.isStarred(resource)).toBe(false)
  expect(state.list?.items).toEqual([])
  expect(request).toHaveBeenCalledTimes(1)
  addResponse.resolve(Response.json({ bookmark: saved() }))
  expect(await add).toBe(false)
  expect(await undo).toBe(true)
  expect(request.mock.calls.map(([, options]) => options?.method)).toEqual([
    'POST',
    'DELETE'
  ])
  expect(state.list?.items).toEqual([])
})

it('keeps the original request when the user toggles back to its value', async () => {
  const { state, request } = await setup()
  const response = Promise.withResolvers<Response>()
  request.mockReturnValueOnce(response.promise)
  const first = state.save(resource, true)
  const second = state.save(resource, false)
  const last = state.save(resource, true)
  response.resolve(Response.json({ bookmark: saved() }))
  expect(await Promise.all([first, second, last])).toEqual([false, false, true])
  expect(request).toHaveBeenCalledTimes(1)
  expect(state.list?.items).toEqual([{ ...saved(), resource }])
})

it('rolls back a failed save and still applies the next resource’s change', async () => {
  const { state, request } = await setup()
  const response = Promise.withResolvers<Response>()
  request
    .mockReturnValueOnce(response.promise)
    .mockResolvedValueOnce(Response.json({ bookmark: saved('manifests/dcba') }))
  const add = state.save(resource, true)
  const next = state.save({ type: 'manifest', id: 'dcba' }, true)
  response.resolve(new Response(null, { status: 409 }))
  await expect(add).rejects.toThrow('Starred is full')
  expect(await next).toBe(true)
  expect(state.list?.items).toMatchObject([
    { resource: { type: 'manifest', id: 'dcba' } }
  ])
})

it('discards outstanding changes when the account changes', async () => {
  const { state, request } = await setup()
  const response = Promise.withResolvers<Response>()
  request.mockReturnValueOnce(response.promise)
  const add = state.save(resource, true)
  const next = state.save({ type: 'manifest', id: 'dcba' }, true)
  state.setAccount('another-reader')
  response.resolve(Response.json({ bookmark: saved() }))
  expect(await Promise.all([add, next])).toEqual([false, false])
  expect(state.list).toBeUndefined()
  expect(request).toHaveBeenCalledTimes(1)
})
