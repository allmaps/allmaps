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
  import { getVarsState } from '$lib/state/vars.svelte.js'

  import {
    gotoRoute,
    getViewUrl,
    getNewParamsFromUrl
  } from '$lib/shared/router.js'
  import { getAnnotationUrl, getViewerUrl } from '$lib/shared/urls.js'
  import { m } from '$lib/paraglide/messages.js'

  import type { Example } from '$lib/types/shared.js'
  import type { EditorPublicEnv } from '@allmaps/env/editor'

  const scopeState = getScopeState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const varsState = getVarsState<EditorPublicEnv>()

  const examplesApiUrl = varsState.PUBLIC_EXAMPLES_API_URL
  const annotationsApiBaseUrl = varsState.PUBLIC_ANNOTATIONS_BASE_URL
  const viewerBaseUrl = varsState.PUBLIC_VIEWER_BASE_URL

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
      const fetchedExamples = (await fetch(`${examplesApiUrl}/?count=1`).then(
        (response) => response.json()
      )) as Example[]

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
      navigator.clipboard.writeText(
        getAnnotationUrl(annotationsApiBaseUrl, scopeState.allmapsId)
      )
    }
  }

  function handleCopyViewerUrlToClipboard() {
    if (scopeState.allmapsId) {
      navigator.clipboard.writeText(
        getViewerUrl(viewerBaseUrl, annotationsApiBaseUrl, scopeState.allmapsId)
      )
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
    class="flex h-full w-full flex-col self-start overflow-hidden rounded-xl focus:outline-hidden"
  >
    <div class="flex items-center gap-2 p-2">
      <MagnifyingGlassIcon class="size-4 shrink-0" />
      <Command.Input
        class="focus-override placeholder:text-foreground-alt/50 inline-flex w-full truncate rounded-lg border-none bg-white
        transition-colors focus:ring-0 focus:outline-none"
        placeholder={m.search_or_paste_iiif_url()}
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
    <Command.List class="overflow-x-hidden overflow-y-auto pb-2">
      <Command.Viewport>
        <Command.Empty
          class="text-muted-foreground flex w-full items-center justify-center pt-8 pb-6 text-sm"
        >
          {m.no_results_found()}
        </Command.Empty>
        <Command.Group>
          <Command.GroupHeading
            class="text-muted-foreground px-3 pt-4 pb-2 text-xs"
          >
            {m.georeference_new_map()}
          </Command.GroupHeading>
          <Command.GroupItems>
            {#if mightBeUrl}
              <Command.Item
                {value}
                class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
                onSelect={handleOpenUrl}
              >
                <CopyIcon class="size-4 shrink-0" />
                <span class="flex w-full items-center gap-1">
                  <span class="shrink-0">{m.open_url()}</span>
                  <span class="truncate">{value}</span>
                </span>
              </Command.Item>
            {/if}

            <Command.Item
              class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
              keywords={['iiif resource', 'open', 'iiif-resource', 'openen']}
              onSelect={handleNewIiifResource}
            >
              <LinkIcon class="size-4 shrink-0" />
              {m.open_iiif_resource_from_url()}
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
              keywords={[
                'iiif',
                'resource',
                'open',
                'random',
                'example',
                'willekeurig',
                'voorbeeld'
              ]}
              onSelect={handleRandomIiifResource}
            >
              <ShuffleIcon class="size-4 shrink-0" />
              {m.open_random_iiif_resource()}
            </Command.Item>
          </Command.GroupItems>
        </Command.Group>
        <Command.Group>
          <Command.GroupHeading
            class="text-muted-foreground px-3 pt-4 pb-2 text-xs"
          >
            {m.copy_to_clipboard_group()}
          </Command.GroupHeading>
          <Command.GroupItems>
            <Command.Item
              class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
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
              {m.copy_georeference_annotation_url()}
              <span>
                <Kbd>Cmd</Kbd>+<Kbd>Shift</Kbd>+<Kbd>C</Kbd>
              </span>
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
              keywords={['copy', 'georeference', 'viewer', 'clipboard']}
              onSelect={handleCopyViewerUrlToClipboard}
            >
              <CopyIcon class="size-4 " />
              {m.copy_viewer_url()}
            </Command.Item>

            <Command.Item
              class="flex h-10 cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none select-none data-selected:bg-gray-100"
              keywords={['copy', 'georeference', 'annotation', 'clipboard']}
              onSelect={handleCopyGeoreferenceAnnotationToClipboard}
            >
              <CopyIcon class="size-4 " />
              {m.copy_georeference_annotation()}
            </Command.Item>
          </Command.GroupItems>
        </Command.Group>
      </Command.Viewport>
    </Command.List>
  </Command.Root>
</Modal>
