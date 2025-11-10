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

  const manifest = $derived(sourceState.parsedManifest)

  // TODO: use https://github.com/nfrasser/linkifyjs
  // to parse links in manifest labels and descriptions
</script>

{#if sourceState.parsedManifest}
  <!-- TODO: move contents to grid cell in layout so max-h is no longer needed -->
  <!-- --bits-popover-content-available-height -->
  <div class="max-h-[calc(100vh-200px)] overflow-auto">
    {#if manifest}
      <div class="flex flex-col gap-6">
        <!-- Manifest label and URI -->
        {#if manifest.label}
          <div class="flex flex-col gap-2 border-b border-gray-200 pb-4">
            <h4 class="text-lg leading-tight font-semibold text-gray-900">
              {parseLanguageString(manifest.label, 'en')}
            </h4>
            <a
              href={manifest.uri}
              target="_blank"
              rel="noopener noreferrer"
              class="group inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-pink"
            >
              <LinkIcon size="12" class="shrink-0" />
              <span class="font-mono break-all group-hover:underline"
                >{manifest.uri}</span
              >
              <ArrowSquareOutIcon
                size="12"
                class="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </a>
          </div>
        {/if}

        <!-- Description -->
        {#if manifest.description}
          <div class="flex flex-col gap-2">
            <h5
              class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
              Description
            </h5>
            <p class="text-sm leading-relaxed text-gray-700">
              {parseLanguageString(manifest.description, 'en')}
            </p>
          </div>
        {/if}

        <!-- Summary -->
        {#if manifest.summary}
          <div class="flex flex-col gap-2">
            <h5
              class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
              Summary
            </h5>
            <p class="text-sm leading-relaxed text-gray-700">
              {parseLanguageString(manifest.summary, 'en')}
            </p>
          </div>
        {/if}

        <!-- navDate -->
        {#if manifest.navDate}
          <div class="bg-gray-50 flex items-start gap-3 rounded-lg p-3">
            <CalendarIcon size="18" class="mt-0.5 shrink-0 text-gray-600" />
            <div class="flex flex-col gap-0.5">
              <span class="text-xs font-medium text-gray-500">Date</span>
              <span class="text-sm font-medium text-gray-900">
                {formatNavDate(manifest.navDate)}
              </span>
            </div>
          </div>
        {/if}

        <!-- Required Statement / Attribution -->
        {#if manifest.requiredStatement}
          <div class="bg-amber-50/50 rounded-lg border border-gray-200 p-4">
            <h5 class="mb-2 text-xs font-semibold text-gray-700">
              {parseLanguageString(manifest.requiredStatement.label, 'en')}
            </h5>
            <p class="text-sm leading-relaxed text-gray-700">
              {parseLanguageString(manifest.requiredStatement.value, 'en')}
            </p>
          </div>
        {/if}

        <!-- Metadata -->
        {#if manifest.metadata && manifest.metadata.length > 0}
          <div class="flex flex-col gap-3">
            <h5
              class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
              Additional Information
            </h5>
            <dl
              class="bg-gray-50 grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4"
            >
              {#each manifest.metadata as item (item.label)}
                {#if item.label && item.value}
                  <div class="flex flex-col gap-1">
                    <dt class="text-xs font-medium break-all text-gray-600">
                      {parseLanguageString(item.label, 'en')}
                    </dt>
                    <dd class="text-sm break-all text-gray-900">
                      {parseLanguageString(item.value, 'en')}
                    </dd>
                  </div>
                {/if}
              {/each}
            </dl>
          </div>
        {/if}

        <!-- Homepage links -->
        {#if manifest.homepage && manifest.homepage.length > 0}
          <div class="flex flex-col gap-2">
            <h5
              class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
              Related Links
            </h5>
            <div class="flex flex-col gap-2">
              {#each manifest.homepage as homepage (homepage.id)}
                <a
                  href={homepage.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group hover:bg-pink-50 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all hover:border-pink hover:text-pink-700"
                >
                  <LinkIcon size="16" class="shrink-0" />
                  <span class="break-all">
                    {homepage.label
                      ? parseLanguageString(homepage.label, 'en')
                      : homepage.id}
                  </span>
                  <ArrowSquareOutIcon
                    size="14"
                    class="ml-auto shrink-0 opacity-50 group-hover:opacity-100"
                  />
                </a>
              {/each}
            </div>
          </div>
        {/if}

        <!-- See Also links -->
        {#if manifest.seeAlso && manifest.seeAlso.length > 0}
          <div class="flex flex-col gap-2">
            <h5
              class="text-xs font-semibold tracking-wider text-gray-500 uppercase"
            >
              See Also
            </h5>
            <div class="flex flex-col gap-2">
              {#each manifest.seeAlso as seeAlso (seeAlso.id)}
                <a
                  href={seeAlso.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="group hover:bg-pink-50 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 transition-all hover:border-pink hover:text-pink-700"
                >
                  <LinkIcon size="16" class="shrink-0" />
                  <span class="break-all">
                    {seeAlso.format
                      ? `${seeAlso.format} resource`
                      : 'External resource'}
                  </span>
                  <ArrowSquareOutIcon
                    size="14"
                    class="ml-auto shrink-0 opacity-50 group-hover:opacity-100"
                  />
                </a>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
