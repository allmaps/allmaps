<script lang="ts">
  import { Command } from 'bits-ui'

  import { Modal, Kbd } from '@allmaps/components'

  import {
    MagnifyingGlass as MagnifyingGlassIcon,
    Shuffle as ShuffleIcon,
    Link as LinkIcon,
    Copy as CopyIcon
  } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import {
    gotoRoute,
    getViewUrl,
    getNewParamsFromUrl
  } from '$lib/shared/router.js'
  import { getAnnotationUrl, getViewerUrl } from '$lib/shared/urls.js'

  import { PUBLIC_EXAMPLES_API_URL } from '$env/static/public'

  import type { Example } from '$lib/types/shared.js'

  const scopeState = getScopeState()
  const uiState = getUiState()
  const urlState = getUrlState()

  let value = $state('')

  let mightBeUrl = $derived.by(() => {
    try {
      const url = new URL(value)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  })

  function handleNewIiifResource() {
    gotoRoute('/')
  }

  async function handleRandomIiifResource() {
    try {
      const fetchedExamples = (await fetch(
        `${PUBLIC_EXAMPLES_API_URL}/?count=1`
      ).then((response) => response.json())) as Example[]

      const url = fetchedExamples[0].manifestId

      if (url) {
        gotoRoute(
          urlState.generateUrl(getViewUrl('images'), getNewParamsFromUrl(url))
        )
      }
    } catch {
      console.error('Failed to fetch random IIIF resource')
    }
  }

  function handleCopyGeoreferenceAnnotationUrlToClipboard() {
    if (scopeState.allmapsId) {
      navigator.clipboard.writeText(getAnnotationUrl(scopeState.allmapsId))
    }
  }

  function handleCopyViewerUrlToClipboard() {
    if (scopeState.allmapsId) {
      navigator.clipboard.writeText(getViewerUrl(scopeState.allmapsId))
    }
  }

  function handleCopyGeoreferenceAnnotationToClipboard() {
    if (scopeState.annotation) {
      navigator.clipboard.writeText(
        JSON.stringify(scopeState.annotation, null, 2)
      )
    }
  }

  function handleOpenUrl() {
    gotoRoute(
      urlState.generateUrl(getViewUrl('images'), getNewParamsFromUrl(value))
    )
  }
</script>

<Modal bind:open={uiState.modalOpen.command}>
  <Command.Root
    class="flex h-full w-full flex-col self-start overflow-hidden rounded-xl
    "
  >
    <div class="flex items-center gap-2 p-2">
      <MagnifyingGlassIcon class="size-4 shrink-0" />
      <Command.Input
        class="focus-override placeholder:text-foreground-alt/50 inline-flex w-full truncate rounded-lg border-none bg-white
        transition-colors focus:outline-none focus:ring-0 "
        placeholder="Search for something or paste a IIIF URL…"
        bind:value
      />
      <Kbd>Esc</Kbd>
    </div>
    <!-- <div
      class="flex items-center gap-1 rounded-md
        bg-green-100 p-2 text-sm text-green-600"
    >
      <ClipboardIcon weight="bold" class="size-4 shrink-0" />
      <p>Paste a URL to open a new IIIF resource and start georeferencing</p>
    </div> -->
    <Command.List class="overflow-y-auto overflow-x-hidden pb-2">
      <Command.Viewport>
        <Command.Empty
          class="text-muted-foreground flex w-full items-center justify-center pb-6 pt-8 text-sm"
        >
          No results found.
        </Command.Empty>
        <Command.Group>
          <Command.GroupHeading
            class="text-muted-foreground px-3 pb-2 pt-4 text-xs"
          >
            Georeference a new map
          </Command.GroupHeading>
          <Command.GroupItems>
            {#if mightBeUrl}
              <Command.Item
                {value}
                class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
                onSelect={handleOpenUrl}
              >
                <CopyIcon class="size-4 shrink-0" />
                <span class="flex w-full items-center gap-1">
                  <span class="shrink-0">Open URL</span>
                  <span class="truncate">{value}</span>
                </span>
              </Command.Item>
            {/if}

            <Command.Item
              class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
              keywords={['iiif resource', 'open']}
              onSelect={handleNewIiifResource}
            >
              <LinkIcon class="size-4 shrink-0" />
              Open a IIIF resource from a URL
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
              keywords={['iiif', 'resource', 'open', 'random', 'example']}
              onSelect={handleRandomIiifResource}
            >
              <ShuffleIcon class="size-4 shrink-0" />
              Open a random IIIF resource
            </Command.Item>
          </Command.GroupItems>
        </Command.Group>
        <Command.Group>
          <Command.GroupHeading
            class="text-muted-foreground px-3 pb-2 pt-4 text-xs"
          >
            Copy to Clipboard
          </Command.GroupHeading>
          <Command.GroupItems>
            <Command.Item
              class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
              keywords={[
                'copy',
                'georeference',
                'annotation',
                'url',
                'clipboard'
              ]}
              onSelect={handleCopyGeoreferenceAnnotationUrlToClipboard}
            >
              <CopyIcon class="size-4 shrink-0" />
              Copy Georeference Annotation URL to clipboard
              <span>
                <Kbd>Cmd</Kbd>+<Kbd>Shift</Kbd>+<Kbd>C</Kbd>
              </span>
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
              keywords={['copy', 'georeference', 'viewer', 'clipboard']}
              onSelect={handleCopyViewerUrlToClipboard}
            >
              <CopyIcon class="size-4 " />
              Copy Allmaps Viewer URL to clipboard
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none data-[selected]:bg-gray-100"
              keywords={['copy', 'georeference', 'annotation', 'clipboard']}
              onSelect={handleCopyGeoreferenceAnnotationToClipboard}
            >
              <CopyIcon class="size-4 " />
              Copy Georeference Annotation to clipboard
            </Command.Item>
          </Command.GroupItems>
        </Command.Group>
      </Command.Viewport>
    </Command.List>
  </Command.Root>
</Modal>
