import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { test } from 'node:test'
import { compileModule } from 'svelte/compiler'

import type {
  EditorMapGuideContext,
  EditorMapGuideMessageDefinition
} from '../src/lib/types/map-guide.js'

// Run with: node --conditions=browser --test test/map-guide.test.ts
// Compile the real rune-based state without loading the app's Vite build.
const stateUrl = new URL(
  '../src/lib/state/map-guide.svelte.ts',
  import.meta.url
)
const hooks = registerHooks({
  load(url, context, nextLoad) {
    if (url !== stateUrl.href) {
      return nextLoad(url, context)
    }

    const source = stripTypeScriptTypes(readFileSync(stateUrl, 'utf8'))
    return {
      format: 'module',
      source: compileModule(source, { filename: stateUrl.pathname }).js.code,
      shortCircuit: true
    }
  }
})
const { MapGuideState } = (await import(
  stateUrl.href
)) as typeof import('../src/lib/state/map-guide.svelte.js')
hooks.deregister()

function createState() {
  const context: EditorMapGuideContext = {
    resourceKey: 'test-resource',
    firstUse: false,
    progress: {
      resourceLoaded: true,
      imageCount: 0,
      mapCount: 0,
      activeImageMapCount: 0,
      activeImageHasMaps: false,
      maskedMapCount: 0,
      georeferencedMapCount: 0,
      exportReadyMapCount: 0,
      imagesWithoutMaps: [],
      imagesWithoutMasksCount: 0,
      mapsNeedingGeoreferencing: [],
      mapsNeedingGeoreferencingCount: 0,
      exportReadyMaps: [],
      exportReady: false
    }
  }
  const state = new MapGuideState()
  state.setContext(context)
  return state
}

function createDefinition(
  label: string,
  run: () => void
): EditorMapGuideMessageDefinition {
  return {
    id: 'shared-message',
    getMarkdown: () => label,
    actions: [{ id: 'go', label, run }]
  }
}

test('dynamic overrides use the displayed action and removal restores the static action', () => {
  const state = createState()
  const calls: string[] = []
  state.setDefinitions([createDefinition('static', () => calls.push('static'))])
  state.upsertMessage(createDefinition('dynamic', () => calls.push('dynamic')))

  assert.equal(state.currentItem?.markdown, 'dynamic')
  assert.equal(state.runAction('shared-message', 'go'), true)
  assert.deepEqual(calls, ['dynamic'])

  state.removeMessage('shared-message')
  assert.equal(state.currentItem?.markdown, 'static')
  assert.equal(state.runAction('shared-message', 'go'), true)
  assert.deepEqual(calls, ['dynamic', 'static'])
})

test('duplicate static IDs use the last definition for display and actions', () => {
  const state = createState()
  const calls: string[] = []
  state.setDefinitions([
    createDefinition('first', () => calls.push('first')),
    createDefinition('last', () => calls.push('last'))
  ])

  assert.equal(state.currentItem?.markdown, 'last')
  assert.equal(state.runAction('shared-message', 'go'), true)
  assert.deepEqual(calls, ['last'])
})

test('completion prompts use their own action despite colliding hidden messages', () => {
  const state = createState()
  const calls: string[] = []
  state.setDefinitions([
    {
      ...createDefinition('static', () => calls.push('static')),
      isRelevant: () => false
    }
  ])
  state.upsertMessage({
    ...createDefinition('dynamic', () => calls.push('dynamic')),
    isRelevant: () => false
  })
  state.setCompletionPrompt(
    createDefinition('completion', () => calls.push('completion'))
  )

  assert.equal(state.messages.length, 0)
  assert.equal(state.currentItem?.markdown, 'completion')
  assert.equal(state.runAction('shared-message', 'go'), true)
  assert.deepEqual(calls, ['completion'])
})

test('unknown messages and actions do not execute a handler', () => {
  const state = createState()
  const calls: string[] = []
  state.setCompletionPrompt(
    createDefinition('completion', () => calls.push('completion'))
  )

  assert.equal(state.runAction('unknown', 'go'), false)
  assert.equal(state.runAction('shared-message', 'unknown'), false)
  assert.deepEqual(calls, [])
})
