<script lang="ts">
  import { page } from '$app/state'
  import { getAuthContext } from '@allmaps/components/auth'

  import {
    addListItemByUrl,
    getList,
    renameList as renameListCommand,
    removeListItem as removeListItemCommand
  } from '$lib/lists.remote.js'
  import { queryResult } from '$lib/query-result.js'

  import type { AuthSessionState } from '@allmaps/components/auth'
  import type { Readable } from 'svelte/store'
  import type { PageProps } from './$types'
  import type {
    LanguageString,
    ListDetail,
    ListItem
  } from '$lib/lists.remote.js'

  let { data }: PageProps = $props()

  const annotationsBaseUrl = $derived(page.data.env.PUBLIC_ANNOTATIONS_BASE_URL)
  const viewerBaseUrl = $derived(
    page.data.env.PUBLIC_VIEWER_BASE_URL.replace(/\/+$/, '')
  )

  const listId = $derived(data.listId)
  const { client } = getAuthContext()
  const session = client.useSession() as Readable<AuthSessionState>

  type SessionUser = {
    slug?: string | null
  }

  function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Failed to load list'
  }

  let urlInput = $state('')
  let adding = $state(false)
  let addError = $state<string | null>(null)
  let addSuccess = $state<string | null>(null)
  let renaming = $state(false)
  let renameError = $state<string | null>(null)
  let renameSuccess = $state<string | null>(null)
  let removingItem = $state<string | null>(null)

  let username = $derived(
    ($session.data?.user as SessionUser | undefined)?.slug ?? null
  )
  let listUrl = $derived(
    username ? `${annotationsBaseUrl}/@${username}/lists/${listId}` : null
  )
  let listViewerUrl = $derived(
    listUrl ? `${viewerBaseUrl}/?url=${encodeURIComponent(listUrl)}` : null
  )

  function itemType(item: ListItem): string {
    if (item.mapId) {
      return 'map'
    } else if (item.imageId) {
      return 'image'
    } else if (item.canvasId) {
      return 'canvas'
    } else if (item.manifestId) {
      return 'manifest'
    } else {
      return 'unknown'
    }
  }

  function itemId(item: ListItem): string {
    return item.mapId ?? item.imageId ?? item.canvasId ?? item.manifestId ?? '?'
  }

  function labelToText(label?: LanguageString): string | undefined {
    if (!label) {
      return
    }

    const preferredKeys = ['en', 'none']
    for (const key of preferredKeys) {
      const values = label[key]
      if (values?.length) {
        return values.map(String).join(' ')
      }
    }

    const firstValues = Object.values(label).find((values) => values.length > 0)
    return firstValues ? firstValues.map(String).join(' ') : undefined
  }

  function itemAnnotationUrl(item: ListItem): string | undefined {
    if (item.mapId) {
      return `${annotationsBaseUrl}/maps/${item.mapId}`
    } else if (item.imageId) {
      return `${annotationsBaseUrl}/images/${item.imageId}`
    } else if (item.canvasId) {
      return `${annotationsBaseUrl}/canvases/${item.canvasId}`
    } else if (item.manifestId) {
      return `${annotationsBaseUrl}/manifests/${item.manifestId}`
    }
  }

  function itemViewerUrl(item: ListItem): string {
    const url = itemAnnotationUrl(item)
    return url ? `${viewerBaseUrl}/?url=${encodeURIComponent(url)}` : ''
  }

  async function removeItem(item: ListItem) {
    const key = itemId(item)
    removingItem = key

    const params = new URLSearchParams()
    if (item.mapId) params.set('mapId', item.mapId)
    else if (item.imageId) params.set('imageId', item.imageId)
    else if (item.canvasId) params.set('canvasId', item.canvasId)
    else if (item.manifestId) params.set('manifestId', item.manifestId)

    try {
      await removeListItemCommand({
        listId,
        mapId: params.get('mapId') ?? undefined,
        imageId: params.get('imageId') ?? undefined,
        canvasId: params.get('canvasId') ?? undefined,
        manifestId: params.get('manifestId') ?? undefined
      }).updates(getList(listId))
    } finally {
      removingItem = null
    }
  }

  function itemTitle(item: ListItem): string | undefined {
    if (item.canvasId) {
      return labelToText(item.canvasLabel ?? undefined)
    } else if (item.manifestId) {
      return labelToText(item.manifestLabel ?? undefined)
    }
  }

  async function addItem() {
    const url = urlInput.trim()
    if (!url) {
      return
    }

    adding = true
    addError = null
    addSuccess = null

    try {
      await addListItemByUrl({ listId, url }).updates(getList(listId))

      urlInput = ''
      addSuccess = `Added successfully`
    } catch (err) {
      addError =
        err instanceof Error ? err.message : 'Network error. Please try again.'
    } finally {
      adding = false
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') addItem()
  }

  async function renameList(event: SubmitEvent) {
    event.preventDefault()

    const form = event.currentTarget
    if (!(form instanceof HTMLFormElement)) {
      return
    }

    const formData = new FormData(form)
    const nameValue = formData.get('name')
    const name = typeof nameValue === 'string' ? nameValue.trim() : ''

    renameError = null
    renameSuccess = null

    if (!name) {
      renameError = 'Name is required'
      return
    }

    renaming = true

    try {
      await renameListCommand({ listId, name }).updates(getList(listId))

      renameSuccess = 'List name updated'
    } catch (err) {
      renameError =
        err instanceof Error ? err.message : 'Network error. Please try again.'
    } finally {
      renaming = false
    }
  }

  const listResult = $derived(await queryResult<ListDetail>(getList(listId)))
</script>

<div class="max-w-4xl mx-auto px-4 py-8">
  <div class="mb-8">
    {#if listResult.data}
      {@const list = listResult.data}
      <h1 class="text-3xl font-bold">{list.label || list.name}</h1>
      {#if list.label}
        <p class="text-sm text-gray-400 font-mono mt-1">{list.name}</p>
      {/if}
    {:else}
      <h1 class="text-3xl font-bold text-red-600">List not found</h1>
    {/if}
  </div>

  {#if listUrl && listViewerUrl}
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-3">List URL</h2>
      <a
        href={listUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="block text-sm font-mono text-blue-600 hover:underline break-all"
      >
        {listUrl}
      </a>
      <a
        href={listViewerUrl}
        target="_blank"
        rel="noopener noreferrer"
        class="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Open in Allmaps Viewer
      </a>
    </div>
  {/if}

  <!-- Rename list -->
  {#if listResult.data}
    {@const list = listResult.data}
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <h2 class="text-xl font-semibold mb-3">List Name</h2>
      <form onsubmit={renameList} class="space-y-3">
        <input
          name="name"
          type="text"
          value={list.name}
          required
          class="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div class="flex items-center gap-3">
          <button
            type="submit"
            disabled={renaming}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {renaming ? 'Saving...' : 'Save name'}
          </button>
          {#if renameError}
            <p class="text-sm text-red-600">{renameError}</p>
          {/if}
          {#if renameSuccess}
            <p class="text-sm text-green-600">{renameSuccess}</p>
          {/if}
        </div>
      </form>
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow p-6 mb-6">
      <p class="text-sm text-red-600">{errorMessage(listResult.error)}</p>
    </div>
  {/if}

  <!-- Add item by URL -->
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-xl font-semibold mb-3">Add Item</h2>
    <p class="text-sm text-gray-500 mb-3">
      Paste an <code class="bg-gray-100 px-1 rounded"
        >annotations.allmaps.org</code
      > URL for a map, image, canvas, or manifest.
    </p>
    <div class="flex gap-2">
      <input
        type="url"
        bind:value={urlInput}
        onkeydown={handleKeydown}
        placeholder="https://annotations.allmaps.org/maps/d9474a8524a4309d"
        class="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
      />
      <button
        onclick={addItem}
        disabled={adding || !urlInput.trim()}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {adding ? 'Adding...' : 'Add'}
      </button>
    </div>
    {#if addError}
      <p class="mt-2 text-sm text-red-600">{addError}</p>
    {/if}
    {#if addSuccess}
      <p class="mt-2 text-sm text-green-600">{addSuccess}</p>
    {/if}
  </div>

  <!-- Items list -->
  {#if listResult.data}
    {@const list = listResult.data}
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold mb-4">
        Items <span class="text-gray-400 font-normal text-base"
          >({list.items.length})</span
        >
      </h2>
      {#if list.items.length === 0}
        <p class="text-sm text-gray-500 italic">No items yet. Add one above.</p>
      {:else}
        <div class="space-y-2">
          {#each list.items as item (`${itemType(item)}:${itemId(item)}`)}
            {@const title = itemTitle(item)}
            {@const key = itemId(item)}
            <div
              class="flex items-center gap-3 px-3 py-2 rounded border border-gray-200"
            >
              <span
                class="text-xs px-2 py-0.5 rounded font-medium shrink-0 {itemType(
                  item
                ) === 'map'
                  ? 'bg-blue-100 text-blue-700'
                  : itemType(item) === 'image'
                    ? 'bg-green-100 text-green-700'
                    : itemType(item) === 'canvas'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-orange-100 text-orange-700'}"
              >
                {itemType(item)}
              </span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-mono text-gray-700 truncate">{key}</p>
                {#if title}
                  <p class="text-sm text-gray-600 truncate">{title}</p>
                {/if}
              </div>
              {#if item.createdAt}
                <span class="text-xs text-gray-400 shrink-0">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              {/if}
              <a
                href={itemViewerUrl(item)}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs hover:text-pink shrink-0 whitespace-nowrap"
                title="Open in Allmaps Viewer"
              >
                View ↗
              </a>
              <button
                onclick={() => removeItem(item)}
                disabled={removingItem === key}
                class="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-40 cursor-pointer"
                title="Remove from list"
              >
                {removingItem === key ? '…' : 'Remove'}
              </button>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="bg-white rounded-lg shadow p-6">
      <p class="text-sm text-red-600">{errorMessage(listResult.error)}</p>
    </div>
  {/if}
</div>
