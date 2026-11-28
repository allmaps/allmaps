import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { compileModule } from 'svelte/compiler'
import { flushSync } from 'svelte'
import { generateId } from '@allmaps/id'

import type { SourceState as EditorSourceState } from '../src/lib/state/source.svelte.js'

const stateUrl = new URL('../src/lib/state/source.svelte.ts', import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const mocks: Record<string, string> = {
      '$app/state': "export const page = { route: { id: '/(views)/mask' } }",
      '$app/navigation': 'export function goto() {}',
      '$lib/i18n/locale.js': "export const getCurrentLocale = () => 'en'"
    }
    if (specifier in mocks)
      return {
        url: 'data:text/javascript,' + encodeURIComponent(mocks[specifier]),
        shortCircuit: true
      }
    if (specifier.startsWith('$lib/'))
      return {
        url: new URL(
          specifier.replace('$lib/', '../src/lib/').replace(/\.js$/, '.ts'),
          import.meta.url
        ).href,
        shortCircuit: true
      }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url !== stateUrl.href) return nextLoad(url, context)
    const source =
      stripTypeScriptTypes(readFileSync(stateUrl, 'utf8')) +
      '\nexport function runInRoot(callback) { return $effect.root(callback) }'
    return {
      format: 'module',
      source: compileModule(source, { filename: stateUrl.pathname }).js.code,
      shortCircuit: true
    }
  }
})
const { SourceState, runInRoot } = (await import(stateUrl.href)) as {
  SourceState: typeof EditorSourceState
  runInRoot: (callback: () => void) => () => void
}
const { UrlState } = (await import(
  new URL('../src/lib/state/url.svelte.ts', import.meta.url).href
)) as typeof import('../src/lib/state/url.svelte.js')
const { searchParams } = (await import(
  new URL('../src/lib/shared/params.ts', import.meta.url).href
)) as typeof import('../src/lib/shared/params.js')
hooks.deregister()

test('manifest navigation opens the explicitly selected service even after its sibling was opened', async (t) => {
  const manifest = JSON.parse(
    readFileSync(
      new URL(
        '../../../packages/iiif-parser/test/input/manifest.3.sfo-1762679999.json',
        import.meta.url
      ),
      'utf8'
    )
  )
  const [other, canvas] = manifest.items
  const first = other.items[0].items[0].body.service[0].id
  const services = canvas.items[0].items[0].body.service
  const older = services[0].id
  const preferred = 'https://library.example/3/map'
  services.push({ id: preferred, type: 'ImageService3', profile: 'level2' })
  const api = 'https://api.example'
  const requests: string[] = []
  const url = new URL('https://editor.example/mask')
  url.searchParams.set('url', manifest.id)
  url.searchParams.set('image', preferred)
  const urlState = new UrlState(url, searchParams)
  t.mock.method(
    globalThis,
    'fetch',
    async (url: string, init?: RequestInit) => {
      if (url === manifest.id) return Response.json(manifest)
      if (url.startsWith(api + '/manifests/'))
        return Response.json({
          canvases: [
            {
              uri: other.id,
              images: [{ uri: first }],
              imageServicesIndexed: true
            },
            {
              uri: canvas.id,
              images: [{ uri: preferred }],
              imageServicesIndexed: true
            }
          ]
        })
      if (!init?.body) return new Response(null, { status: 404 })
      const uri = JSON.parse(String(init.body)).url.replace(/\/info\.json$/, '')
      requests.push(uri)
      const data = {
        id: uri,
        type: 'ImageService3',
        profile: 'level2',
        protocol: 'http://iiif.io/api/image',
        width: 1000,
        height: 1000
      }
      return Response.json({ uri, data })
    }
  )
  let state!: EditorSourceState
  const errors = { error: undefined }
  t.after(
    runInRoot(() => {
      state = new SourceState(
        api,
        api,
        urlState,
        errors as ConstructorParameters<typeof SourceState>[3]
      )
    })
  )
  for (const uri of [preferred, older, preferred]) {
    url.searchParams.set('image', uri)
    urlState.updateUrl(url)
    flushSync()
    await t.waitFor(() => {
      assert.ifError(errors.error)
      assert.ifError(state.imageError)
      assert.equal(state.activeImage?.embedded, false)
      assert.equal(state.activeImageId, uri)
      assert.equal(state.activeCanvas?.uri, canvas.id)
    })
    assert.equal(state.activeImageAllmapsId, await generateId(uri))
  }
  assert.deepEqual(requests, [preferred, older])
})
