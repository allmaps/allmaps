<script lang="ts">
  import {
    ArrowSquareOut as ArrowSquareOutIcon,
    Calendar as CalendarIcon,
    Link as LinkIcon,
    Info as InfoIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getIiifState } from '$lib/state/iiif.svelte.js'

  import Popover from '$lib/components/Popover.svelte'

  import {
    getMapLabels,
    formatLabels,
    getTimeAgo
  } from '$lib/shared/metadata.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import SmallLoading from '$lib/images/allmaps-loading.webp'

  type Props = {
    map: GeoreferencedMap
  }

  let { map }: Props = $props()

  const uiState = getUiState()
  const iiifState = getIiifState()

  let open = $state(false)

  // TODO: get labels and title from layout data!
  let labels = $derived(map ? getMapLabels(map) : [])
  let title = $derived(formatLabels(labels))

  $effect(() => {
    if (open) {
      iiifState.manifestIds.forEach((id) => {
        iiifState.fetchManifest(id)
      })
    }
  })

  // Check loading state for manifests
  let hasLoadingManifests = $derived(iiifState.hasLoadingManifests)

  let viewerUrl = $derived(
    map.id && `https://viewer.allmaps.org/?url=${encodeURIComponent(map.id)}`
  )
  let editorUrl = $derived(
    `https://editor.allmaps.org/images?url=${encodeURIComponent(
      `${map.resource.id}/info.json`
    )}`
  )

  // Get all parsed manifests that are available
  let availableManifests = $derived(
    iiifState.manifestIds
      .map((id) => iiifState.getParsedManifest(id))
      .filter(
        (manifest): manifest is NonNullable<typeof manifest> =>
          manifest !== undefined
      )
  )

  // TODO: use https://github.com/nfrasser/linkifyjs
  // to parse links in manifest labels and descriptions

  // Format navigation date helper
  function formatNavDate(navDate?: Date): string {
    if (!navDate) return ''
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(navDate)
  }
</script>

{#if title}
  <Popover bind:open>
    {#snippet button()}
      <div
        bind:clientWidth={uiState.elementSizes.top.center[0]}
        bind:clientHeight={uiState.elementSizes.top.center[1]}
        class="max-w-xl min-w-0 truncate shadow hover:shadow-lg transition-shadow duration-100
          bg-white rounded-full px-2 py-1.5 cursor-pointer text-sm text-green font-medium leading-tight
            flex gap-2 items-center"
      >
        <span class="pl-1">{title}</span>
        <InfoIcon class="size-6" weight="bold" />
      </div>
    {/snippet}
    {#snippet contents()}
      {#if map}
        <!-- TODO: move contents to grid cell in layout so max-h is no longer needed -->
        <div class=" max-h-[calc(100vh-150px)] overflow-auto">
          <!-- Loading indicator for manifests -->
          {#if hasLoadingManifests}
            <div class="p-4 border-b border-gray-200 flex items-center gap-2">
              <img src={SmallLoading} alt="Loading" class="w-4 h-4" />
              <span class="text-sm text-gray-600">Loading metadata…</span>
            </div>
          {/if}

          <!-- Manifests information -->
          {#if availableManifests.length > 0}
            <div class="max-h-96 overflow-y-auto">
              {#each availableManifests as manifest, index (manifest.uri)}
                <div
                  class="flex flex-col gap-4 p-4 {index > 0
                    ? 'border-t border-gray-100'
                    : ''}"
                >
                  <!-- Manifest label -->
                  {#if manifest.label}
                    <div class="flex flex-col gap-2">
                      <h4 class="font-medium text-gray-900 text-base">
                        {parseLanguageString(manifest.label, 'en')}
                      </h4>
                      <a
                        href={manifest.uri}
                        class="text-xs text-gray-500 font-mono hover:underline break-all"
                      >
                        {manifest.uri}
                      </a>
                    </div>
                  {/if}

                  <!-- Description -->
                  {#if manifest.description}
                    <div class="flex flex-col gap-2">
                      <h5 class="text-sm font-medium text-gray-700">
                        Description
                      </h5>
                      <p class="text-sm text-gray-600 leading-relaxed">
                        {parseLanguageString(manifest.description, 'en')}
                      </p>
                    </div>
                  {/if}

                  <!-- Homepage links -->
                  {#if manifest.homepage && manifest.homepage.length > 0}
                    <div>
                      <h5 class="text-sm font-medium text-gray-700 mb-2">
                        Related Links
                      </h5>
                      <div class="space-y-1">
                        {#each manifest.homepage as homepage}
                          <a
                            href={homepage.id}
                            class="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            <LinkIcon size="14" />
                            {homepage.label
                              ? parseLanguageString(homepage.label, 'en')
                              : homepage.id}
                            <ArrowSquareOutIcon size="12" />
                          </a>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- navDate -->
                  {#if manifest.navDate}
                    <div class="flex items-center gap-2">
                      <CalendarIcon size="16" class="text-gray-500" />
                      <span class="text-sm text-gray-600">
                        <strong>Date:</strong>
                        {formatNavDate(manifest.navDate)}
                      </span>
                    </div>
                  {/if}

                  <!-- Summary -->
                  {#if manifest.summary}
                    <div class="flex flex-col gap-2">
                      <h5 class="text-sm font-medium text-gray-700">Summary</h5>
                      <p class="text-sm text-gray-600">
                        {parseLanguageString(manifest.summary, 'en')}
                      </p>
                    </div>
                  {/if}

                  <!-- Required Statement / Attribution -->
                  {#if manifest.requiredStatement}
                    <div class="flex flex-col gap-2">
                      <h5 class="text-sm font-medium text-gray-700">
                        {parseLanguageString(
                          manifest.requiredStatement.label,
                          'en'
                        )}
                      </h5>
                      <p class="text-sm text-gray-600">
                        {parseLanguageString(
                          manifest.requiredStatement.value,
                          'en'
                        )}
                      </p>
                    </div>
                  {/if}

                  <!-- Metadata -->
                  {#if manifest.metadata && manifest.metadata.length > 0}
                    <div class="flex flex-col gap-2">
                      <h5 class="text-sm font-medium text-gray-700">
                        Metadata
                      </h5>
                      <dl class="grid grid-cols-1 gap-4">
                        {#each manifest.metadata as item}
                          {#if item.label && item.value}
                            <!-- <div class="flex flex-col gap-2"> -->
                            <dt
                              class="text-xs font-medium text-gray-700 uppercase tracking-wide break-all"
                            >
                              {parseLanguageString(item.label, 'en')}
                            </dt>
                            <dd class="text-sm text-gray-900 pl-4 break-all">
                              {parseLanguageString(item.value, 'en')}
                            </dd>
                            <!-- </div> -->
                          {/if}
                        {/each}
                      </dl>
                    </div>
                  {/if}

                  <!-- See Also links -->
                  {#if manifest.seeAlso && manifest.seeAlso.length > 0}
                    <div class="mb-3">
                      <h5 class="text-sm font-medium text-gray-700 mb-2">
                        See Also
                      </h5>
                      <div class="space-y-1">
                        {#each manifest.seeAlso as seeAlso}
                          <a
                            href={seeAlso.id}
                            class="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            <LinkIcon size="14" />
                            {seeAlso.format
                              ? `${seeAlso.format} resource`
                              : 'External resource'}
                            <ArrowSquareOutIcon size="12" />
                          </a>
                        {/each}
                      </div>
                    </div>
                  {/if}

                  <!-- Rendering links -->
                  {#if manifest.rendering && manifest.rendering.length > 0}
                    <div class="mb-3">
                      <h5 class="text-sm font-medium text-gray-700 mb-2">
                        Other versions
                      </h5>
                      <div class="inline-flex flex-wrap gap-2">
                        {#each manifest.rendering as rendering}
                          <a
                            href={rendering.id}
                            class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 underline"
                          >
                            <LinkIcon size="14" />
                            {rendering.label
                              ? parseLanguageString(rendering.label, 'en')
                              : `${rendering.format} resource`}
                            <ArrowSquareOutIcon size="12" />
                          </a>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {:else if !hasLoadingManifests}
            <div class="p-4 text-center text-gray-500">
              <p class="text-sm">No metadata available</p>
            </div>
          {/if}

          <div
            class="inset-shadow p-3 bg-linear-to-tr from-yellow/20 to-pink/20 border-t border-gray-200
              grid grid-cols-[1fr_max-content] grid-rows-2 gap-4"
          >
            {#if viewerUrl}
              <p class="text-sm text-gray-700">
                Open this map in <strong>Allmaps Viewer</strong> to see it displayed
                on a map of the world.
              </p>
              <a
                class="group inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 ease-out relative
                place-self-end overflow-hidden border border-gray-300 hover:border-gray-400"
                href={viewerUrl}
              >
                <div
                  class="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                ></div>
                <ArrowSquareOutIcon
                  size="18"
                  weight="bold"
                  class="relative z-10"
                />
                <span class="relative z-10">Allmaps Viewer</span>
                <div
                  class="absolute -right-1 -top-1 w-2 h-2 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </a>
            {/if}
            <p class="text-sm text-gray-700">
              Open this map in <strong>Allmaps Editor</strong> to view and update
              its georeferencing.
            </p>
            <a
              class="group inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 rounded-lg shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 ease-out relative
              place-self-end overflow-hidden border border-gray-300 hover:border-gray-400"
              href={editorUrl}
            >
              <div
                class="absolute inset-0 bg-gray-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              ></div>
              <ArrowSquareOutIcon
                size="18"
                weight="bold"
                class="relative z-10"
              />
              <span class="relative z-10">Allmaps Editor</span>
              <div
                class="absolute -right-1 -top-1 w-2 h-2 bg-gray-400/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              ></div>
            </a>
          </div>

          <div class="p-3 border-b border-gray-200 flex flex-col gap-2">
            <div class="flex justify-between items-center gap-2">
              <h3 class="text-sm font-medium text-gray-700">
                Georeference Annotation
              </h3>
              <span class="text-xs text-gray-600"
                >Updated {getTimeAgo(map)}</span
              >
            </div>
            <div class="text-sm text-gray-600 flex items-center gap-2">
              <!-- <input
                class="w-full mt-1 p-2 text-xs bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                tabindex="-1"
                readonly
                inert
                value={map.id}
              /> -->
              <div
                class="w-full mt-1 p-2 text-xs bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
              >
                {map.id}
              </div>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed text-center">
              Copy the URL of the Georeference Annotation to use it in other
              parts of Allmaps.
            </p>
          </div>
        </div>
      {/if}
    {/snippet}
  </Popover>
{/if}
