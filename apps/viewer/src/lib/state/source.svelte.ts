import { setContext, getContext } from 'svelte'

import type { Source } from '$lib/types/shared.js'
import type { UiState } from '$lib/state/ui.svelte.js'

const SOURCE_KEY = Symbol('source')

export type SourceErrorReason = 'url' | 'data'

export type SourceError = {
  reason: SourceErrorReason
  message: string
  sourceUrl?: string
}

export class SourceState {
  #uiState: UiState

  #source = $state<Source | undefined>()
  #error = $state<SourceError | undefined>()

  constructor(uiState: UiState, initialSource?: Source) {
    this.#uiState = uiState

    this.source = initialSource
  }

  set source(source: Source | undefined) {
    this.#uiState.reset()
    this.#source = source
    this.#error = undefined
  }

  get source(): Source | undefined {
    return this.#source
  }

  set error(error: SourceError | undefined) {
    this.#error = error
  }

  get error(): SourceError | undefined {
    return this.#error
  }
}

export function setSourceState(uiState: UiState, initialSource?: Source) {
  return setContext(SOURCE_KEY, new SourceState(uiState, initialSource))
}

export function getSourceState() {
  const sourceState = getContext<SourceState>(SOURCE_KEY)
  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
