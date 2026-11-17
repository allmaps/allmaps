import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { compileModule } from 'svelte/compiler'
import { flushSync } from 'svelte'

import type { SourceState } from '../src/lib/state/source.svelte.js'
import type { UrlState } from '../src/lib/state/url.svelte.js'
import type { searchParams } from '../src/lib/shared/params.js'

const stateUrl = new URL('../src/lib/state/ui.svelte.ts', import.meta.url)
const rootUrl = new URL('./ui-test-root.svelte.js', import.meta.url)
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === rootUrl.href) {
      return { url: rootUrl.href, shortCircuit: true }
    }
    if (context.parentURL === stateUrl.href) {
      if (specifier === '$app/environment') {
        return {
          url: 'data:text/javascript,export const browser = false',
          shortCircuit: true
        }
      }
      if (specifier === '$lib/shared/ui-events.js') {
        return {
          url: new URL('../src/lib/shared/ui-events.ts', import.meta.url).href,
          shortCircuit: true
        }
      }
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === rootUrl.href) {
      return {
        format: 'module',
        source: compileModule(
          'export function runInRoot(callback) { return $effect.root(callback) }',
          { filename: rootUrl.pathname }
        ).js.code,
        shortCircuit: true
      }
    }
    if (url !== stateUrl.href) {
      return nextLoad(url, context)
    }
    return {
      format: 'module',
      source: compileModule(
        stripTypeScriptTypes(readFileSync(stateUrl, 'utf8')),
        { filename: stateUrl.pathname }
      ).js.code,
      shortCircuit: true
    }
  }
})
const { UiState } = (await import(
  stateUrl.href
)) as typeof import('../src/lib/state/ui.svelte.js')
const { runInRoot } = (await import(rootUrl.href)) as {
  runInRoot: (callback: () => void) => () => void
}
hooks.deregister()

test('a late close from Map Settings does not close the newly opened Maps panel', () => {
  const cleanup = runInRoot(() => {
    const state = new UiState(
      { params: {} } as UrlState<typeof searchParams>,
      { source: undefined } as SourceState
    )
    flushSync()

    state.popoverOpen.mapSettings = true
    state.closeModalsAndPopovers()
    state.popoverOpen.maps = true
    state.popoverOpen.mapSettings = false

    assert.equal(state.popoverOpen.maps, true)
    assert.equal(state.popoverOpen.mapSettings, false)

    state.popoverOpen.maps = false
    assert.equal(state.popoverOpen.maps, false)
  })
  cleanup()
})
