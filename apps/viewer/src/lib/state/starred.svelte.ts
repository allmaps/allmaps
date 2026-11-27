import { createContext } from 'svelte'

import { annotationsBaseUrl, restBaseUrl } from '$lib/shared/auth.js'
import {
  changeStarredItem,
  getStarredList,
  matchesResource
} from '$lib/shared/starred.js'
import type { StarredList, StarredResource } from '$lib/shared/starred.js'

export const [getStarredState, setStarredState] = createContext<StarredState>()

type PendingSave = {
  resource: StarredResource
  starred: boolean
  resolve: (saved: boolean) => void
  reject: (error: unknown) => void
}

function sameResource(a: StarredResource, b: StarredResource) {
  return (
    a.id === b.id &&
    a.type === b.type &&
    (a.type !== 'map' || b.type !== 'map' || a.checksum === b.checksum)
  )
}

export class StarredState {
  #username = $state<string>()
  #list = $state.raw<StarredList>()
  #status = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  #read?: AbortController
  #write?: AbortController
  #pending = $state.raw<PendingSave[]>([])

  get list() {
    return this.#list
  }

  isStarred(resource: StarredResource) {
    return this.#resources.some((saved) => matchesResource(saved, resource))
  }

  #resources = $derived.by(() => {
    let resources = this.#list?.items.map((item) => item.resource) ?? []
    for (const change of this.#pending) {
      if (change.starred) {
        if (!resources.some((saved) => matchesResource(saved, change.resource)))
          resources.push(change.resource)
      } else {
        resources = resources.filter(
          (saved) => !matchesResource(saved, change.resource)
        )
      }
    }
    return resources
  })

  get status() {
    return this.#status
  }

  get saving() {
    return this.#pending.length > 0
  }

  setAccount(username?: string) {
    if (this.#username === username) return

    this.#read?.abort()
    this.#read = undefined
    this.#write?.abort()
    for (const change of this.#pending) change.resolve(false)
    this.#pending = []
    this.#write = undefined
    this.#list = undefined
    this.#status = 'idle'
    this.#username = username
  }

  async load() {
    if (!this.#username || this.#read || this.#write) return

    const controller = new AbortController()
    const { signal } = controller
    this.#read = controller
    this.#status = 'loading'
    try {
      const list = await getStarredList(
        annotationsBaseUrl,
        this.#username,
        signal
      )
      if (signal.aborted) return

      this.#list = list
      this.#status = 'ready'
    } catch {
      if (!signal.aborted) this.#status = 'error'
    } finally {
      if (this.#read === controller) this.#read = undefined
    }
  }

  save(resource: StarredResource, starred: boolean): Promise<boolean> {
    if (!this.#list) return Promise.resolve(false)

    this.#read?.abort()
    this.#read = undefined
    this.#status = 'ready'

    return new Promise((resolve, reject) => {
      const change = { resource, starred, resolve, reject }
      const last = this.#pending.at(-1)
      if (last && sameResource(last.resource, resource)) {
        last.resolve(false)
        this.#pending = [...this.#pending.slice(0, -1), change]
      } else {
        this.#pending = [...this.#pending, change]
      }

      if (!this.#write) {
        this.#write = new AbortController()
        void this.#savePending(this.#write.signal)
      }
    })
  }

  async #savePending(signal: AbortSignal) {
    while (this.#pending.length && this.#list) {
      const change = this.#pending[0]
      const list = this.#list
      try {
        const items = await changeStarredItem(
          restBaseUrl,
          annotationsBaseUrl,
          list,
          change.resource,
          change.starred,
          signal
        )
        if (signal.aborted) return
        this.#list = { ...list, items }
        const latest = this.#pending[0]
        if (latest.starred !== change.starred) continue
        latest.resolve(true)
      } catch (error) {
        if (signal.aborted) return
        if (this.#pending[0] !== change) continue
        change.reject(error)
      }
      this.#pending = this.#pending.slice(1)
    }
    this.#write = undefined
  }
}
