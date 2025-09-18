<script lang="ts">
  import { page } from '$app/state'

  import { Dialog, Command } from 'bits-ui'

  import {
    Shuffle as ShuffleIcon,
    Link as LinkIcon,
    Copy as CopyIcon
  } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'

  import { createRouteUrl, gotoRoute } from '$lib/shared/router.js'
  import { getAnnotationUrl, getViewerUrl } from '$lib/shared/urls.js'

  import { PUBLIC_EXAMPLES_API_URL } from '$env/static/public'

  import type { Example } from '$lib/types/shared.js'

  const scopeState = getScopeState()

  let dialogOpen = $state(false)

  let value = $state('')

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      dialogOpen = true
    }
  }

  function handleNewIiifResource() {
    gotoRoute(createRouteUrl(page, '', { url: '' }))
    dialogOpen = false
  }

  async function handleRandomIiifResource() {
    const fetchedExamples = (await fetch(
      `${PUBLIC_EXAMPLES_API_URL}/?count=1`
    ).then((response) => response.json())) as Example[]

    try {
      const url = fetchedExamples[0].manifestId
      gotoRoute(createRouteUrl(page, 'images', { url }))
    } finally {
      dialogOpen = false
    }
  }

  function handleCopyGeoreferenceAnnotationUrlToClipboard() {
    if (scopeState.allmapsId) {
      navigator.clipboard.writeText(getAnnotationUrl(scopeState.allmapsId))
    }

    dialogOpen = false
  }

  function handleCopyViewerUrlToClipboard() {
    if (scopeState.allmapsId) {
      navigator.clipboard.writeText(getViewerUrl(scopeState.allmapsId))
    }

    dialogOpen = false
  }

  function handleCopyGeoreferenceAnnotationToClipboard() {
    if (scopeState.annotation) {
      navigator.clipboard.writeText(
        JSON.stringify(scopeState.annotation, null, 2)
      )
    }
    dialogOpen = false
  }
</script>

<svelte:document onkeydown={handleKeydown} />

<Dialog.Root bind:open={dialogOpen}>
  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-50 bg-[rgba(0,0,0,0.75)] p-4
      data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out"
    />
    <Dialog.Content
      class="fixed left-[50%] top-[20%] max-h-[70%] z-50 w-full max-w-[94%] translate-x-[-50%] rounded-lg
       bg-white shadow-lg outline-none border-gray-100
       sm:max-w-[490px] md:w-full"
    >
      <Dialog.Title class="sr-only">Command Menu</Dialog.Title>
      <Dialog.Description class="sr-only">
        This is the command menu. Use the arrow keys to navigate and press ⌘K to
        open the search bar.
      </Dialog.Description>
      <Command.Root
        class="flex h-full w-full flex-col divide-y divide-border self-start overflow-hidden rounded-xl border
         border-gray-100 bg-white"
      >
        <Command.Input
          class="p-2 focus-override inline-flex w-full border-none truncate rounded-lg bg-white px-4 transition-colors
          placeholder:text-foreground-alt/50 focus:outline-none focus:ring-0 inset-shadow-sm"
          placeholder="Search for something..."
          bind:value
        />
        <Command.List class="overflow-y-auto overflow-x-hidden px-2 pb-2">
          <Command.Viewport>
            <Command.Empty
              class="flex w-full items-center justify-center pb-6 pt-8 text-sm text-muted-foreground"
            >
              No results found.
            </Command.Empty>
            <Command.Group>
              <Command.GroupHeading
                class="px-3 pb-2 pt-4 text-xs text-muted-foreground"
              >
                Georeference a new map
              </Command.GroupHeading>
              <Command.GroupItems>
                <Command.Item
                  class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2.5 text-sm outline-none data-[selected]:bg-gray-100"
                  keywords={['iiif resource', 'open']}
                  onSelect={handleNewIiifResource}
                >
                  <LinkIcon class="size-4" />
                  Open a IIIF resource from a URL
                </Command.Item>
                <Command.Item
                  class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2.5 text-sm outline-none data-[selected]:bg-gray-100"
                  keywords={['iiif', 'resource', 'open', 'random', 'example']}
                  onSelect={handleRandomIiifResource}
                >
                  <ShuffleIcon class="size-4" />
                  Open a random IIIF resource
                </Command.Item>
              </Command.GroupItems>
            </Command.Group>
            <Command.Group>
              <Command.GroupHeading
                class="px-3 pb-2 pt-4 text-xs text-muted-foreground"
              >
                Copy to Clipboard
              </Command.GroupHeading>
              <Command.GroupItems>
                <Command.Item
                  class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2.5 text-sm outline-none data-[selected]:bg-gray-100"
                  keywords={[
                    'copy',
                    'georeference',
                    'annotation',
                    'url',
                    'clipboard'
                  ]}
                  onSelect={handleCopyGeoreferenceAnnotationUrlToClipboard}
                >
                  <CopyIcon class="size-4" />
                  Copy Georeference Annotation URL to clipboard
                </Command.Item>

                <Command.Item
                  class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2.5 text-sm outline-none data-[selected]:bg-gray-100"
                  keywords={['copy', 'georeference', 'viewer', 'clipboard']}
                  onSelect={handleCopyViewerUrlToClipboard}
                >
                  <CopyIcon class="size-4 " />
                  Copy Allmaps Viewer URL to clipboard
                </Command.Item>

                <Command.Item
                  class="flex h-10 cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2.5 text-sm outline-none data-[selected]:bg-gray-100"
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
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
