<script lang="ts">
  import {
    ArrowSquareOut as ArrowSquareOutIcon,
    Calendar as CalendarIcon,
    Link as LinkIcon
  } from 'phosphor-svelte'

  import { getSourceState } from '$lib/state/source.svelte.js'

  import { formatNavDate } from '$lib/shared/metadata.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'

  const sourceState = getSourceState()

  const manifest = $derived(
    sourceState.source?.type === 'manifest'
      ? sourceState.source.parsedIiif
      : undefined
  )

  // TODO: use https://github.com/nfrasser/linkifyjs
  // to parse links in manifest labels and descriptions
</script>

{#if sourceState.source?.parsedIiif}
  <!-- TODO: move contents to grid cell in layout so max-h is no longer needed -->
  <div class=" max-h-[calc(100vh-200px)] overflow-auto">
    <!-- Manifests information -->

    {#if manifest}
      <div class="max-h-96 overflow-y-auto">
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
            <h5 class="text-sm font-medium text-gray-700">Description</h5>
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
              {#each manifest.homepage as homepage (homepage.id)}
                <a
                  href={homepage.id}
                  class="inline-flex items-center gap-2 text-sm text-pink hover:text-pink-600 transition-colors underline break-all"
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
              {parseLanguageString(manifest.requiredStatement.label, 'en')}
            </h5>
            <p class="text-sm text-gray-600">
              {parseLanguageString(manifest.requiredStatement.value, 'en')}
            </p>
          </div>
        {/if}

        <!-- Metadata -->
        {#if manifest.metadata && manifest.metadata.length > 0}
          <div class="flex flex-col gap-4">
            <h5 class="text-sm font-medium text-gray-700">Metadata</h5>
            <dl class="grid grid-cols-1 gap-4">
              {#each manifest.metadata as item (item.label)}
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
            <h5 class="text-sm font-medium text-gray-700 mb-2">See Also</h5>
            <div class="space-y-1">
              {#each manifest.seeAlso as seeAlso (seeAlso.id)}
                <a
                  href={seeAlso.id}
                  class="inline-flex items-center gap-2 text-sm text-pink hover:text-pink-600 transition-colors underline"
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
        <!-- {#if manifest.rendering && manifest.rendering.length > 0}
              <div class="mb-3">
                <h5 class="text-sm font-medium text-gray-700 mb-2">
                  Other versions
                </h5>
                <div class="inline-flex flex-wrap gap-2">
                  {#each manifest.rendering as rendering (rendering.id)}
                    <a
                      href={rendering.id}
                      class="inline-flex items-center gap-2 text-sm text-pink hover:text-pink-600 transition-colors underline"
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
            {/if} -->
      </div>
    {/if}
  </div>
{/if}
